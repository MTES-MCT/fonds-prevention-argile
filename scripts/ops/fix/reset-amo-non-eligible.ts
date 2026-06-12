/**
 * Remise en validation AMO d'un dossier "archivé — non éligible".
 *
 * Contexte
 * --------
 * Un dossier peut afficher côté espace agent le callout "Dossier archivé — non
 * éligible" alors que `parcours_prevention.archived_at` est NULL. Le message UI
 * (InfoDossierCallout.tsx) n'est PAS piloté par l'archivage du parcours mais par
 * `parcours_amo_validations.statut = 'logement_non_eligible'`. Il y a donc DEUX
 * notions d'archivage indépendantes :
 *
 *   A. parcours_prevention.archived_at + situation_particulier = 'archive'
 *      -> filtres dashboard admin, findActiveForSync() (CRON)
 *   B. parcours_amo_validations.statut = 'logement_non_eligible'
 *      -> callout UI "Dossier archivé — non éligible"
 *
 * "Désarchiver au sens attendu" = remettre les DEUX notions dans un état cohérent
 * "en attente de validation AMO", c'est-à-dire :
 *   - parcours.current_step   = choix_amo            (inchangé)
 *   - parcours.current_status = en_instruction       (état d'attente AMO, cf. selectAmoForUser)
 *   - parcours.situation      = prospect             (désarchivage notion A)
 *   - parcours.archived_at    = NULL
 *   - validation.statut       = en_attente           (désarchivage notion B)
 *   - validation.validee_at   = NULL, commentaire = NULL, tracking email reset
 *   - un token amo_validation_tokens frais (90 j) pour que l'AMO puisse valider
 *   - optionnellement : ré-envoi de l'email de validation à l'AMO (--send-email)
 *
 * Pourquoi ce script et pas selectAmoForUser ?
 * --------------------------------------------
 * selectAmoForUser() fait l'upsert EN_ATTENTE + token + email + status, MAIS il
 * exige `parcours.rgaSimulationData.logement.commune` (la simulation DU DEMANDEUR).
 * Un dossier archivé "à la création" par un agent a généralement sa simulation
 * dans `rgaSimulationDataAgent`, pas `rgaSimulationData` -> selectAmoForUser
 * échouerait sur "Simulation RGA non complétée". Ce script lit le code INSEE depuis
 * la simulation demandeur OU agent (fallback) et ne dépend donc pas de ce pré-requis.
 *
 * La vérification de couverture territoriale de l'AMO (checkAmoCoversTerritory,
 * privée) n'est PAS rejouée : l'AMO a déjà été assignée à la création du dossier.
 * Le script le signale explicitement.
 *
 * Niveaux d'engagement
 * --------------------
 *   (rien)         dry-run : affiche l'état actuel et le plan, aucune écriture
 *   --apply        applique la remise en attente (transaction) sans envoyer d'email
 *   --apply --send-email   applique ET ré-envoie l'email de validation à l'AMO
 *
 * Ciblage (un seul requis)
 *   --parcours-id=<uuid>   cible un parcours précis (recommandé en prod)
 *   --nom=<nom>            recherche par users.nom (ILIKE) ; abandon si != 1 résultat
 *
 * Usage
 *   pnpm tsx scripts/ops/reset-amo-non-eligible.ts --parcours-id=<uuid>                 # dry-run
 *   pnpm tsx scripts/ops/reset-amo-non-eligible.ts --nom=Dupont                         # dry-run
 *   pnpm tsx scripts/ops/reset-amo-non-eligible.ts --parcours-id=<uuid> --apply         # sans email
 *   pnpm tsx scripts/ops/reset-amo-non-eligible.ts --parcours-id=<uuid> --apply --send-email
 *
 * Pré-requis : .env.local avec DATABASE_URL. Pour --send-email, la config email
 * (Brevo en prod / Mailhog en dev) et BASE_URL doivent être valides.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, desc, eq, ilike } from "drizzle-orm";
import * as schema from "@/shared/database/schema";
import {
  parcoursPrevention,
  parcoursAmoValidations,
  amoValidationTokens,
  entreprisesAmo,
  users,
} from "@/shared/database/schema";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { AMO_VALIDATION_TOKEN_VALIDITY_DAYS } from "@/features/parcours/amo/domain/value-objects/constants";
import { normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";

// --- Args ---
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}
const APPLY = args.includes("--apply");
const SEND_EMAIL = args.includes("--send-email");
const PARCOURS_ID = getArg("parcours-id");
const NOM = getArg("nom");

if (!PARCOURS_ID && !NOM) {
  console.error("Ciblage requis : --parcours-id=<uuid> ou --nom=<nom>");
  process.exit(1);
}
if (SEND_EMAIL && !APPLY) {
  console.error("--send-email nécessite --apply (rien à envoyer en dry-run).");
  process.exit(1);
}

// --- DB ---
const connectionString =
  process.env.DATABASE_URL ??
  (() => {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST) throw new Error("DATABASE_URL ou DB_HOST requis");
    return `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  })();
const client = postgres(connectionString, { max: 5, idle_timeout: 10 });
const db = drizzle(client, { schema });

function line() {
  console.log("=".repeat(72));
}

/** Code INSEE depuis la simulation demandeur puis agent (fallback). */
function resolveCodeInsee(parcours: typeof parcoursPrevention.$inferSelect): {
  codeInsee: string | null;
  source: "demandeur" | "agent" | "aucune";
} {
  const demandeurCommune = parcours.rgaSimulationData?.logement?.commune;
  const agentCommune = parcours.rgaSimulationDataAgent?.logement?.commune;
  if (demandeurCommune) {
    return { codeInsee: normalizeCodeInsee(demandeurCommune), source: "demandeur" };
  }
  if (agentCommune) {
    return { codeInsee: normalizeCodeInsee(agentCommune), source: "agent" };
  }
  return { codeInsee: null, source: "aucune" };
}

async function main() {
  line();
  console.log(`RESET AMO NON-ÉLIGIBLE — ${APPLY ? (SEND_EMAIL ? "APPLY + EMAIL" : "APPLY") : "DRY-RUN"}`);
  line();

  // --- 1. Résolution du parcours ---
  let parcoursRow: typeof parcoursPrevention.$inferSelect | undefined;

  if (PARCOURS_ID) {
    [parcoursRow] = await db.select().from(parcoursPrevention).where(eq(parcoursPrevention.id, PARCOURS_ID)).limit(1);
  } else if (NOM) {
    const matches = await db
      .select({ parcours: parcoursPrevention, nom: users.nom, prenom: users.prenom, email: users.email })
      .from(parcoursPrevention)
      .innerJoin(users, eq(parcoursPrevention.userId, users.id))
      .where(ilike(users.nom, `%${NOM}%`))
      .orderBy(desc(parcoursPrevention.createdAt));

    if (matches.length === 0) {
      console.error(`Aucun parcours pour un nom contenant "${NOM}".`);
      await client.end();
      process.exit(1);
    }
    if (matches.length > 1) {
      console.error(`${matches.length} parcours trouvés pour "${NOM}". Précisez avec --parcours-id :`);
      for (const m of matches) {
        console.error(
          `  ${m.parcours.id}  ${m.prenom ?? ""} ${m.nom ?? ""} <${m.email ?? "?"}>  ${m.parcours.currentStep}/${m.parcours.currentStatus}`
        );
      }
      await client.end();
      process.exit(1);
    }
    parcoursRow = matches[0].parcours;
  }

  if (!parcoursRow) {
    console.error("Parcours introuvable.");
    await client.end();
    process.exit(1);
  }
  const parcoursId = parcoursRow.id;

  // --- 2. Chargement des données liées ---
  const [user] = await db.select().from(users).where(eq(users.id, parcoursRow.userId)).limit(1);
  const [validation] = await db
    .select()
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);
  const tokens = await db
    .select()
    .from(amoValidationTokens)
    .where(eq(amoValidationTokens.parcoursAmoValidationId, validation?.id ?? "00000000-0000-0000-0000-000000000000"));
  const entreprise = validation?.entrepriseAmoId
    ? (await db.select().from(entreprisesAmo).where(eq(entreprisesAmo.id, validation.entrepriseAmoId)).limit(1))[0]
    : undefined;

  const { codeInsee, source: inseeSource } = resolveCodeInsee(parcoursRow);
  const now = new Date();
  const validTokens = tokens.filter((t) => !t.usedAt && t.expiresAt > now);

  // --- 3. Diagnostic ---
  console.log(`Parcours    : ${parcoursId}`);
  console.log(`Demandeur   : ${user?.prenom ?? ""} ${user?.nom ?? ""} <${user?.email ?? "?"}>`);
  console.log(`Étape       : ${parcoursRow.currentStep} / ${parcoursRow.currentStatus}`);
  console.log(
    `Situation A : ${parcoursRow.situationParticulier}  | archived_at=${parcoursRow.archivedAt ? parcoursRow.archivedAt.toISOString() : "NULL"}`
  );
  console.log(
    `Validation B: ${validation ? validation.statut : "<aucune ligne>"}  | validee_at=${validation?.valideeAt ? validation.valideeAt.toISOString() : "NULL"}`
  );
  console.log(`AMO         : ${entreprise ? `${entreprise.nom} (${entreprise.id})` : "<aucune>"}`);
  console.log(`AMO emails  : ${entreprise?.emails ?? "<aucun>"}`);
  console.log(`Code INSEE  : ${codeInsee ?? "<aucun>"} (source: ${inseeSource})`);
  console.log(`Tokens      : ${tokens.length} total, ${validTokens.length} valide(s)`);
  console.log();

  // --- 4. Garde-fous ---
  if (!validation) {
    console.error(
      "ABANDON : aucune ligne parcours_amo_validations. Ce dossier n'a jamais eu d'AMO ; rien à remettre en attente."
    );
    await client.end();
    process.exit(1);
  }
  if (validation.statut !== StatutValidationAmo.LOGEMENT_NON_ELIGIBLE) {
    console.error(
      `ABANDON : statut validation = "${validation.statut}" (attendu "logement_non_eligible"). Sécurité : on ne touche pas un autre statut.`
    );
    await client.end();
    process.exit(1);
  }
  if (parcoursRow.currentStep !== Step.CHOIX_AMO) {
    console.error(
      `ABANDON : current_step = "${parcoursRow.currentStep}" (attendu "choix_amo"). État inattendu, intervention manuelle requise.`
    );
    await client.end();
    process.exit(1);
  }
  if (!validation.entrepriseAmoId || !entreprise) {
    console.error(
      "ABANDON : aucune entreprise AMO rattachée à la validation. Impossible de remettre en attente sans AMO cible."
    );
    await client.end();
    process.exit(1);
  }
  if (SEND_EMAIL && !codeInsee) {
    console.error(
      "ABANDON : --send-email demandé mais aucun code INSEE (ni demandeur ni agent) pour l'email. Relancez sans --send-email."
    );
    await client.end();
    process.exit(1);
  }

  // --- 5. Plan ---
  console.log("PLAN :");
  if (parcoursRow.situationParticulier === SituationParticulier.ARCHIVE || parcoursRow.archivedAt) {
    console.log(`  A. situation '${parcoursRow.situationParticulier}' -> 'prospect', archived_at -> NULL`);
  } else {
    console.log("  A. notion A déjà propre (pas d'archivage parcours) — rien à faire");
  }
  console.log("  B. validation 'logement_non_eligible' -> 'en_attente' (validee_at/commentaire/tracking reset)");
  console.log("  +  nouveau token de validation (90 j)");
  console.log(`  +  current_status '${parcoursRow.currentStatus}' -> 'en_instruction'`);
  console.log(
    SEND_EMAIL
      ? `  +  email de validation envoyé à : ${entreprise.emails}`
      : "  (email non envoyé — ajouter --send-email pour le ré-envoyer)"
  );
  console.log("  NB : couverture territoriale de l'AMO NON re-vérifiée (AMO déjà assignée à la création).");
  console.log();

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Relancer avec --apply pour appliquer.");
    await client.end();
    return;
  }

  // --- 6. Application (transaction) ---
  const newToken = randomUUID();
  const expiresAt = new Date(now.getTime() + AMO_VALIDATION_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    // A. Désarchivage notion A (idempotent : ne touche que si archivé)
    await tx
      .update(parcoursPrevention)
      .set({
        situationParticulier: SituationParticulier.PROSPECT,
        archivedAt: null,
        archiveReason: null,
        archivedBy: null,
        currentStatus: Status.EN_INSTRUCTION,
        updatedAt: now,
      })
      .where(eq(parcoursPrevention.id, parcoursId));

    // B. Remise en attente de la validation AMO (UPDATE conditionnel sur le statut
    //    actuel : protège contre un changement concurrent depuis la détection).
    await tx
      .update(parcoursAmoValidations)
      .set({
        statut: StatutValidationAmo.EN_ATTENTE,
        choisieAt: now,
        valideeAt: null,
        commentaire: null,
        brevoMessageId: null,
        emailSentAt: null,
        emailDeliveredAt: null,
        emailOpenedAt: null,
        emailClickedAt: null,
        emailBounceType: null,
        emailBounceReason: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(parcoursAmoValidations.id, validation.id),
          eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_NON_ELIGIBLE)
        )
      );

    // Token frais
    await tx.insert(amoValidationTokens).values({
      parcoursAmoValidationId: validation.id,
      token: newToken,
      expiresAt,
    });
  });

  console.log("OK — état remis en attente de validation AMO (token créé).");

  // --- 7. Email optionnel ---
  if (SEND_EMAIL && codeInsee) {
    const { sendValidationAmoEmail } = await import("@/shared/email/actions/send-email.actions");
    const emailsList = entreprise.emails
      .split(";")
      .map((e) => e.trim())
      .filter(Boolean);
    const res = await sendValidationAmoEmail({
      amoEmail: emailsList,
      amoNom: entreprise.nom,
      demandeurNom: validation.userNom ?? user?.nom ?? "",
      demandeurPrenom: validation.userPrenom ?? user?.prenom ?? "",
      demandeurCodeInsee: codeInsee,
      adresseLogement: validation.adresseLogement ?? "",
      token: newToken,
    });
    if (res.success) {
      await db
        .update(parcoursAmoValidations)
        .set({ brevoMessageId: res.data?.messageId ?? null, emailSentAt: new Date() })
        .where(eq(parcoursAmoValidations.id, validation.id));
      console.log(
        `OK — email de validation envoyé à ${emailsList.join(", ")} (messageId=${res.data?.messageId ?? "?"}).`
      );
    } else {
      console.error(
        `ÉCHEC envoi email : ${res.error}. L'état BDD est correct ; relancez l'envoi via l'UI ou re-sélection AMO.`
      );
    }
  }

  // --- 8. Vérification finale ---
  const [after] = await db
    .select({
      step: parcoursPrevention.currentStep,
      status: parcoursPrevention.currentStatus,
      situation: parcoursPrevention.situationParticulier,
      archivedAt: parcoursPrevention.archivedAt,
      validationStatut: parcoursAmoValidations.statut,
      valideeAt: parcoursAmoValidations.valideeAt,
    })
    .from(parcoursPrevention)
    .leftJoin(parcoursAmoValidations, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
    .where(eq(parcoursPrevention.id, parcoursId))
    .limit(1);

  console.log();
  line();
  console.log("ÉTAT FINAL :");
  console.log(`  step/status : ${after?.step}/${after?.status}   (attendu choix_amo/en_instruction)`);
  console.log(
    `  situation   : ${after?.situation}   archived_at=${after?.archivedAt ? after.archivedAt.toISOString() : "NULL"}`
  );
  console.log(
    `  validation  : ${after?.validationStatut}   validee_at=${after?.valideeAt ? after.valideeAt.toISOString() : "NULL"}`
  );
  line();

  await client.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  client.end();
  process.exit(1);
});
