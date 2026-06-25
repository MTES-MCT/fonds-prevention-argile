/**
 * Ré-ouverture d'une demande refusée par l'AMO (« changement d'avis » du demandeur).
 *
 * Contexte
 * --------
 * Un demandeur refusé par l'AMO (`parcours_amo_validations.statut = logement_non_eligible`,
 * parfois `accompagnement_refuse`) apparaît dans les archives de l'AMO (état REFUSE) :
 * son parcours est figé en `choix_amo / todo`. Quand le demandeur « se réveille »
 * (il était injoignable, puis revient), on veut ré-ouvrir la demande = remettre la
 * validation AMO en attente pour que l'AMO puisse re-valider.
 *
 * Ce script est un mince wrapper CLI autour du service `reouvrirDemandeRefusee`
 * (`src/features/parcours/amo/services/reouverture-demande.service.ts`), le même que
 * celui appelé par le bouton UI « Ré-ouvrir la demande ». La logique métier (gardes,
 * transaction, token, email) vit dans le service ; ici on ne fait que cibler le
 * parcours, afficher un diagnostic, et déclencher l'action.
 *
 * Ce que fait la ré-ouverture :
 *   - validation : statut refusé -> en_attente (reset valideeAt/commentaire/tracking)
 *   - parcours   : situation -> prospect, archived_at/raison/par -> NULL, status -> en_instruction
 *   - nouveau token de validation (90 j)
 *   - email AMO optionnel (--send-email), nécessite un code INSEE (demandeur ou agent)
 *
 * Niveaux d'engagement
 *   (rien)                 dry-run : affiche l'état + le plan, aucune écriture
 *   --apply                applique la ré-ouverture (sans email)
 *   --apply --send-email   applique ET ré-envoie l'email de validation à l'AMO
 *
 * Ciblage (un seul requis)
 *   --parcours-id=<uuid>   cible un parcours précis (recommandé en prod)
 *   --nom=<nom>            recherche par users.nom (ILIKE) ; abandon si != 1 résultat
 *
 * Usage
 *   pnpm fix:reouvrir-demande --nom=Dupont                          # dry-run
 *   pnpm fix:reouvrir-demande --parcours-id=<uuid>                  # dry-run
 *   pnpm fix:reouvrir-demande --parcours-id=<uuid> --apply
 *   pnpm fix:reouvrir-demande --parcours-id=<uuid> --apply --send-email
 *
 * NB : ce script n'écrit PAS d'entrée d'audit `parcours_actions` (action ops, pas un
 * agent connecté) ; le traçage QUI/QUAND ne concerne que la ré-ouverture via l'UI.
 *
 * Pré-requis : .env.local (ou vars Scalingo) avec la config DB. Pour --send-email,
 * la config email (Brevo prod / Mailhog dev) et BASE_URL doivent être valides.
 */

import "../lib/env";
import { desc, eq, ilike } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { parcoursPrevention, parcoursAmoValidations, entreprisesAmo, users } from "@/shared/database/schema";
import { isValidationRefusee } from "@/features/parcours/amo/domain/value-objects/statutValidation";
import { reouvrirDemandeRefusee } from "@/features/parcours/amo/services/reouverture-demande.service";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const SEND_EMAIL = hasFlag("send-email");
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

function line() {
  console.log("=".repeat(72));
}

async function main() {
  line();
  console.log(`RÉ-OUVERTURE DEMANDE — ${APPLY ? (SEND_EMAIL ? "APPLY + EMAIL" : "APPLY") : "DRY-RUN"}`);
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
      await rawClient.end();
      process.exit(1);
    }
    if (matches.length > 1) {
      console.error(`${matches.length} parcours trouvés pour "${NOM}". Précisez avec --parcours-id :`);
      for (const m of matches) {
        console.error(
          `  ${m.parcours.id}  ${m.prenom ?? ""} ${m.nom ?? ""} <${m.email ?? "?"}>  ${m.parcours.currentStep}/${m.parcours.currentStatus}`
        );
      }
      await rawClient.end();
      process.exit(1);
    }
    parcoursRow = matches[0].parcours;
  }

  if (!parcoursRow) {
    console.error("Parcours introuvable.");
    await rawClient.end();
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
  console.log(`Situation   : ${parcoursRow.situationParticulier}`);
  console.log(`Validation  : ${validation ? validation.statut : "<aucune ligne>"}`);
  console.log(`AMO         : ${entreprise ? `${entreprise.nom} (${entreprise.id})` : "<aucune>"}`);
  console.log();

  // --- 3. Garde-fous (mêmes conditions que le service, pour un dry-run lisible) ---
  if (!validation) {
    console.error("ABANDON : aucune validation AMO. Rien à ré-ouvrir.");
    await rawClient.end();
    process.exit(1);
  }
  if (!isValidationRefusee(validation.statut)) {
    console.error(`ABANDON : la demande n'est pas refusée (statut « ${validation.statut} »).`);
    await rawClient.end();
    process.exit(1);
  }

  // --- 4. Plan ---
  console.log("PLAN :");
  console.log(`  validation '${validation.statut}' -> 'en_attente' (valideeAt/commentaire/tracking reset)`);
  console.log(`  situation '${parcoursRow.situationParticulier}' -> 'prospect', archived_at -> NULL`);
  console.log(`  current_status '${parcoursRow.currentStatus}' -> 'en_instruction'`);
  console.log("  +  nouveau token de validation (90 j)");
  console.log(
    SEND_EMAIL
      ? `  +  email de validation envoyé à : ${entreprise?.emails ?? "<aucun>"}`
      : "  (email non envoyé — ajouter --send-email pour le ré-envoyer)"
  );
  console.log();

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Commande pour appliquer :");
    console.log(`  pnpm fix:reouvrir-demande --parcours-id=${parcoursId} --apply${SEND_EMAIL ? " --send-email" : ""}`);
    await rawClient.end();
    return;
  }

  // --- 5. Application (déléguée au service partagé) ---
  const result = await reouvrirDemandeRefusee({ parcoursId, sendEmailToAmo: SEND_EMAIL });
  if (!result.success) {
    console.error(`ÉCHEC : ${result.error}`);
    await rawClient.end();
    process.exit(1);
  }

  console.log("OK — demande remise en attente de validation AMO.");
  if (SEND_EMAIL) {
    console.log(
      result.data.emailSent
        ? `OK — email de validation envoyé à l'AMO ${result.data.amoNom}.`
        : "ATTENTION — email non envoyé (code INSEE manquant ou échec d'envoi) ; relancer via l'UI si besoin."
    );
  }

  // --- 6. Vérification finale ---
  const [after] = await db
    .select({
      step: parcoursPrevention.currentStep,
      status: parcoursPrevention.currentStatus,
      situation: parcoursPrevention.situationParticulier,
      archivedAt: parcoursPrevention.archivedAt,
      validationStatut: parcoursAmoValidations.statut,
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
  console.log(`  validation  : ${after?.validationStatut}   (attendu en_attente)`);
  line();

  await rawClient.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  rawClient.end();
  process.exit(1);
});
