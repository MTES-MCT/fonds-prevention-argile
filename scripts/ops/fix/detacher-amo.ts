/**
 * Détache l'AMO d'un parcours et le bascule en « sans AMO » (le demandeur fait son
 * parcours seul).
 *
 * Contexte
 * --------
 * Une demandeuse avait choisi un AMO quand celui-ci était obligatoire. Depuis la
 * modification de l'arrêté, l'AMO est facultatif : elle souhaite poursuivre seule.
 * Aucun écran ne permet d'annuler l'accompagnement une fois l'AMO choisi → opération
 * manuelle.
 *
 * Ce script reproduit l'état cible du flux « renoncer à l'AMO » (`skipAmoStepForUser`,
 * `amo-selection.service.ts`) mais en partant d'un AMO DÉJÀ choisi (ou déjà validé),
 * ce que le flux UI ne couvre pas : `parcours_amo_validations` passe en `SANS_AMO`,
 * `entreprise_amo_id` est détaché, le tracking email est purgé, et les tokens de
 * validation encore actifs sont invalidés (le lien email AMO ne doit plus rien valider).
 *
 * Le responsable du parcours « sans AMO » devient l'aller-vers du territoire (résolution
 * habituelle par `rgaSimulationData`) — rien à écrire de plus côté parcours.
 *
 * Progression d'étape
 *   - Si le parcours est encore à `choix_amo` (todo OU en_instruction, l'AMO n'a pas
 *     encore validé) → on avance à `eligibilite / todo`, exactement comme le « skip » UI.
 *   - Si le parcours a déjà dépassé `choix_amo` (AMO validé, éligibilité en cours…) →
 *     on NE touche PAS à l'étape : on se contente de détacher l'AMO. Le dossier en cours
 *     devient « sans AMO » et suit son cours.
 *
 * Niveaux d'engagement
 *   (rien)     dry-run : affiche l'état + le plan, aucune écriture
 *   --apply    applique le détachement
 *
 * Ciblage (un seul requis)
 *   --parcours-id=<uuid>   cible un parcours précis (recommandé en prod)
 *   --nom=<nom>            recherche par users.nom (ILIKE) ; abandon si != 1 résultat
 *
 * Usage
 *   pnpm fix:detacher-amo --nom=Dupont                       # dry-run
 *   pnpm fix:detacher-amo --parcours-id=<uuid>               # dry-run
 *   pnpm fix:detacher-amo --parcours-id=<uuid> --apply
 *
 * NB : action ops (pas un agent connecté) — pas d'entrée d'audit `parcours_actions`.
 *
 * Pré-requis : .env.local (ou vars Scalingo) avec la config DB.
 */

import "../lib/env";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { createOpsDb } from "../lib/db";
import {
  parcoursPrevention,
  parcoursAmoValidations,
  amoValidationTokens,
  entreprisesAmo,
  users,
} from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");
const NOM = getArg("nom");

if (!PARCOURS_ID && !NOM) {
  console.error("Ciblage requis : --parcours-id=<uuid> ou --nom=<nom>");
  process.exit(1);
}

const { db, client } = createOpsDb();

function line() {
  console.log("=".repeat(72));
}

async function main() {
  line();
  console.log(`DÉTACHEMENT AMO (parcours « sans AMO ») — ${APPLY ? "APPLY" : "DRY-RUN"}`);
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

  // --- 2. Diagnostic ---
  const [user] = await db.select().from(users).where(eq(users.id, parcoursRow.userId)).limit(1);
  const [validation] = await db
    .select()
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
    .limit(1);
  const entreprise = validation?.entrepriseAmoId
    ? (await db.select().from(entreprisesAmo).where(eq(entreprisesAmo.id, validation.entrepriseAmoId)).limit(1))[0]
    : undefined;

  console.log(`Parcours    : ${parcoursId}`);
  console.log(`Demandeur   : ${user?.prenom ?? ""} ${user?.nom ?? ""} <${user?.email ?? "?"}>`);
  console.log(`Étape       : ${parcoursRow.currentStep} / ${parcoursRow.currentStatus}`);
  console.log(
    `Validation  : ${validation ? `${validation.statut} (${validation.attributionMode})` : "<aucune ligne>"}`
  );
  console.log(`AMO         : ${entreprise ? `${entreprise.nom} (${entreprise.id})` : "<aucune>"}`);
  console.log();

  // --- 3. Garde-fous ---
  if (!validation) {
    console.error("ABANDON : aucune validation AMO sur ce parcours. Rien à détacher.");
    await client.end();
    process.exit(1);
  }
  if (validation.statut === StatutValidationAmo.SANS_AMO && !validation.entrepriseAmoId) {
    console.error("ABANDON : ce parcours est déjà « sans AMO ». Rien à faire.");
    await client.end();
    process.exit(1);
  }
  if (parcoursRow.archivedAt) {
    console.error(
      `ABANDON : parcours archivé (archived_at=${parcoursRow.archivedAt.toISOString()}). Le désarchiver d'abord.`
    );
    await client.end();
    process.exit(1);
  }

  // --- 4. Plan ---
  const avanceEligibilite = parcoursRow.currentStep === Step.CHOIX_AMO;
  const [pendingTokens] = await db
    .select({ n: amoValidationTokens.id })
    .from(amoValidationTokens)
    .where(and(eq(amoValidationTokens.parcoursAmoValidationId, validation.id), isNull(amoValidationTokens.usedAt)));

  console.log("PLAN :");
  console.log(`  validation '${validation.statut}' -> 'sans_amo' (attributionMode -> 'aucun', entreprise détachée)`);
  console.log(`  purge : commentaire, valideeAt, tracking email, brevoMessageId`);
  console.log(`  tokens AMO actifs -> invalidés (usedAt = now)${pendingTokens ? "" : " — aucun token actif"}`);
  if (avanceEligibilite) {
    console.log(`  étape '${parcoursRow.currentStep}/${parcoursRow.currentStatus}' -> 'eligibilite/todo'`);
  } else {
    console.log(
      `  étape inchangée (déjà au-delà de choix_amo) : '${parcoursRow.currentStep}/${parcoursRow.currentStatus}'`
    );
  }
  console.log();

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Commande pour appliquer :");
    console.log(`  pnpm fix:detacher-amo --parcours-id=${parcoursId} --apply`);
    await client.end();
    return;
  }

  // --- 5. Application (transaction) ---
  await db.transaction(async (tx) => {
    await tx
      .update(parcoursAmoValidations)
      .set({
        entrepriseAmoId: null,
        statut: StatutValidationAmo.SANS_AMO,
        attributionMode: AttributionAmoMode.AUCUN,
        commentaire: null,
        valideeAt: null,
        brevoMessageId: null,
        emailSentAt: null,
        emailDeliveredAt: null,
        emailOpenedAt: null,
        emailClickedAt: null,
        emailBounceType: null,
        emailBounceReason: null,
      })
      .where(eq(parcoursAmoValidations.id, validation.id));

    // Tue les liens email AMO encore actifs (sinon l'AMO pourrait valider après coup).
    await tx
      .update(amoValidationTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(amoValidationTokens.parcoursAmoValidationId, validation.id), isNull(amoValidationTokens.usedAt)));

    if (avanceEligibilite) {
      await tx
        .update(parcoursPrevention)
        .set({ currentStep: Step.ELIGIBILITE, currentStatus: Status.TODO })
        .where(eq(parcoursPrevention.id, parcoursId));
    }
  });

  console.log("OK — AMO détaché, parcours basculé en « sans AMO ».");

  // --- 6. Vérification finale ---
  const [after] = await db
    .select({
      step: parcoursPrevention.currentStep,
      status: parcoursPrevention.currentStatus,
      validationStatut: parcoursAmoValidations.statut,
      entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId,
    })
    .from(parcoursPrevention)
    .leftJoin(parcoursAmoValidations, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
    .where(eq(parcoursPrevention.id, parcoursId))
    .limit(1);

  console.log();
  line();
  console.log("ÉTAT FINAL :");
  console.log(
    `  step/status : ${after?.step}/${after?.status}${avanceEligibilite ? "   (attendu eligibilite/todo)" : "   (inchangé)"}`
  );
  console.log(`  validation  : ${after?.validationStatut}   (attendu sans_amo)`);
  console.log(`  entreprise  : ${after?.entrepriseAmoId ?? "NULL"}   (attendu NULL)`);
  line();

  await client.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  client.end();
  process.exit(1);
});
