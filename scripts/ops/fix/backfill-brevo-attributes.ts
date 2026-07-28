/**
 * Backfill des attributs de contact Brevo — SANS rejouer les évènements.
 *
 * Contexte
 * --------
 * Les attributs Brevo ne sont poussés qu'au moment d'un évènement métier
 * (`emitBrevoEvent`). Un contact créé avant l'ajout d'un attribut au contrat (ex.
 * `CONSEILLER_*`, `ADMIN_URL`) reste figé sur les anciennes données tant qu'aucun
 * nouvel évènement ne repasse dessus — ce qui fait planter les Automations Brevo qui
 * comptent dessus (cf. docs/emails/BREVO-LIFECYCLE.md).
 *
 * Ce script recalcule et pousse (upsert de contact, JAMAIS de `trackEvent` — les
 * évènements historiques ne sont pas rejoués) l'état COURANT complet de chaque
 * contact, en réutilisant les mêmes fonctions que les hooks live :
 *   - buildContactAttributes(user, parcours, email) : PRENOM/NOM/DATE_INSCRIPTION/
 *     SITUATION/ETAPE/STATUT/SOURCE_ACQUISITION/PARCOURS_ID/ADMIN_URL/INSEE/DEPARTEMENT
 *   - buildConseillerAttributes(parcours.id)        : CONSEILLER_TYPE/NOM/EMAIL/
 *     TELEPHONE/HORAIRES
 * Complété par les attributs d'état posés historiquement par les hooks événementiels
 * (non rejouables depuis les fonctions ci-dessus), redérivés ici depuis la vérité DB
 * actuelle :
 *   - A_AMO / AMO_STATUT / EST_MANDATAIRE : depuis `parcours_amo_validations.statut`
 *     (A_AMO = true dès qu'une décision AMO existe : éligible, non éligible, ou
 *     accompagnement refusé — pas seulement "éligible")
 *   - DS_STATUT                           : depuis le dossier DS de l'étape courante
 *   - CREE_PAR_CONSEILLER                 : depuis `parcours.created_by_agent_id`
 *
 * Dry-run par défaut. `--apply` pour écrire. `--parcours-id=<uuid>` pour cibler un
 * parcours. `--sleep=<ms>` (défaut 150) entre deux upserts (rate limit Brevo).
 * Identifiants anonymisés par défaut, `--no-anonymize` pour les emails en clair.
 *
 * Usage :
 *   pnpm fix:backfill-brevo                          # dry-run, tous les parcours
 *   pnpm fix:backfill-brevo --apply
 *   pnpm fix:backfill-brevo --parcours-id=<uuid> --apply
 *   pnpm fix:backfill-brevo --no-anonymize
 *
 * Prérequis : .env.local complet (DATABASE_URL + BREVO_API_KEY + BREVO_CONTACT_LIST_ID
 * + le reste de la config serveur, lue par `getServerEnv()` via `resolveAdminUrl`).
 * No-op propre (rien à faire) si la synchro Brevo est désactivée (local, ou liste non
 * configurée).
 */

import "../lib/env";
import { and, eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  parcoursPrevention,
  users,
  parcoursAmoValidations,
  dossiersDemarchesSimplifiees,
} from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import {
  BREVO_ATTRS,
  resolveBrevoContactEmail,
  isBrevoContactSyncEnabled,
} from "@/shared/email/brevo/brevo-contacts.config";
import { buildContactAttributes } from "@/shared/email/brevo/contact-mapping";
import { buildConseillerAttributes } from "@/shared/email/brevo/conseiller-mapping";
import { upsertContact, type BrevoAttributes } from "@/shared/email/brevo/brevo-contacts.adapter";
import { getArg, hasFlag } from "../lib/args";
import { createRedactor } from "../lib/anonymize";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");
const SLEEP_MS = Number(getArg("sleep") ?? "150");
const ANONYMIZE = !hasFlag("no-anonymize");

const { redactEmail, redactUuid } = createRedactor(ANONYMIZE);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A_AMO = true dès qu'une décision AMO a été rendue, éligible ou non (cf.
// approveValidation / rejectEligibility / declineAccompagnementEligible dans
// amo-validation.service.ts, qui poussent tous les trois A_AMO=true).
const STATUTS_DECIDES = [
  StatutValidationAmo.LOGEMENT_ELIGIBLE,
  StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
  StatutValidationAmo.ACCOMPAGNEMENT_REFUSE,
];

function line() {
  console.log("=".repeat(72));
}

async function buildBackfillAttributes(
  parcours: typeof parcoursPrevention.$inferSelect,
  user: typeof users.$inferSelect,
  email: string
): Promise<BrevoAttributes> {
  const attrs: BrevoAttributes = {
    ...(await buildContactAttributes(user, parcours, email)),
    ...(await buildConseillerAttributes(parcours.id)),
  };

  const [validation] = await db
    .select()
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.parcoursId, parcours.id))
    .limit(1);

  if (validation && STATUTS_DECIDES.includes(validation.statut)) {
    attrs[BREVO_ATTRS.A_AMO] = true;
    attrs[BREVO_ATTRS.AMO_STATUT] = validation.statut;
    if (validation.estMandataireFinancier !== null) {
      attrs[BREVO_ATTRS.EST_MANDATAIRE] = validation.estMandataireFinancier;
    }
  } else {
    attrs[BREVO_ATTRS.A_AMO] = false;
  }

  const [dossierEtapeCourante] = await db
    .select({ dsStatus: dossiersDemarchesSimplifiees.dsStatus })
    .from(dossiersDemarchesSimplifiees)
    .where(
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcours.id),
        eq(dossiersDemarchesSimplifiees.step, parcours.currentStep)
      )
    )
    .limit(1);
  if (dossierEtapeCourante) {
    attrs[BREVO_ATTRS.DS_STATUT] = dossierEtapeCourante.dsStatus ?? "";
  }

  attrs[BREVO_ATTRS.CREE_PAR_CONSEILLER] = parcours.createdByAgentId !== null;

  return attrs;
}

async function main() {
  line();
  console.log(
    `BACKFILL attributs Brevo (sans rejeu d'évènements) — ${APPLY ? "APPLY" : "DRY-RUN"}${ANONYMIZE ? " (anonymisé)" : ""}`
  );
  if (PARCOURS_ID) console.log(`Parcours ciblé : ${PARCOURS_ID}`);
  line();

  if (!isBrevoContactSyncEnabled()) {
    console.log("Synchro Brevo désactivée (local, ou BREVO_API_KEY/BREVO_CONTACT_LIST_ID absents) — rien à faire.");
    return;
  }

  const rows = await db
    .select({ parcours: parcoursPrevention, user: users })
    .from(parcoursPrevention)
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .where(PARCOURS_ID ? eq(parcoursPrevention.id, PARCOURS_ID) : undefined);

  console.log(`Parcours à traiter : ${rows.length}\n`);

  let updated = 0;
  let wouldUpdate = 0;
  let skippedNoEmail = 0;
  let errors = 0;

  for (const { parcours, user } of rows) {
    const email = resolveBrevoContactEmail(user);
    if (!email) {
      skippedNoEmail++;
      continue;
    }

    try {
      const attrs = await buildBackfillAttributes(parcours, user, email);
      console.log(`  ${redactUuid(parcours.id)}  ${redactEmail(email)}  ${Object.keys(attrs).length} attributs`);

      if (APPLY) {
        const ok = await upsertContact(email, attrs);
        if (ok) {
          updated++;
        } else {
          console.error(`    échec upsertContact pour ${redactEmail(email)}`);
          errors++;
        }
      } else {
        wouldUpdate++;
      }
    } catch (error) {
      console.error(`  ERREUR ${redactUuid(parcours.id)}:`, error instanceof Error ? error.message : error);
      errors++;
    }

    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  console.log();
  line();
  console.log("RÉCAP");
  console.log(`  Contacts mis à jour     : ${updated}`);
  console.log(`  Contacts à mettre à jour (dry-run) : ${wouldUpdate}`);
  console.log(`  Ignorés (email non résoluble)      : ${skippedNoEmail}`);
  console.log(`  Erreurs                            : ${errors}`);
  if (!APPLY && wouldUpdate > 0) {
    console.log(`\nRelancer avec --apply pour écrire.`);
  }
  line();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erreur fatale:", error);
    process.exit(1);
  });
