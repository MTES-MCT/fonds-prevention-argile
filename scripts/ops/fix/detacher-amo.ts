/**
 * Détache l'AMO d'un parcours et le bascule en « sans AMO » (le demandeur fait son
 * parcours seul).
 *
 * Contexte
 * --------
 * Une demandeuse avait choisi un AMO quand celui-ci était obligatoire. Depuis la
 * modification de l'arrêté, l'AMO est facultatif : elle souhaite poursuivre seule.
 *
 * Ce script est un mince wrapper CLI autour du service `detacherAmo`
 * (`src/features/parcours/amo/services/detachement-amo.service.ts`), le même que celui
 * appelé par l'UI (annulation demandeur / « Ne plus accompagner » côté AMO). La logique
 * métier (gardes, transaction, invalidation des tokens, avance d'étape) vit dans le
 * service ; ici on ne fait que cibler le parcours, afficher un diagnostic et déclencher.
 *
 * Ce que fait le détachement :
 *   - validation : statut -> sans_amo, entreprise détachée, attributionMode -> aucun,
 *     purge commentaire / valideeAt / mandataire financier / demande d'arrêt / tracking
 *   - tokens AMO actifs -> invalidés (le lien email AMO ne doit plus rien valider)
 *   - étape : encore à choix_amo -> eligibilite/todo ; au-delà -> inchangée
 *
 * Le responsable du parcours « sans AMO » devient l'aller-vers du territoire (résolution
 * habituelle par `rgaSimulationData`) — rien à écrire de plus côté parcours.
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
import { db, rawClient } from "@/shared/database/client";
import {
  parcoursPrevention,
  parcoursAmoValidations,
  amoValidationTokens,
  entreprisesAmo,
  users,
} from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { detacherAmo } from "@/features/parcours/amo/services/detachement-amo.service";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");
const NOM = getArg("nom");

if (!PARCOURS_ID && !NOM) {
  console.error("Ciblage requis : --parcours-id=<uuid> ou --nom=<nom>");
  process.exit(1);
}

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
  console.log(
    `Validation  : ${validation ? `${validation.statut} (${validation.attributionMode})` : "<aucune ligne>"}`
  );
  console.log(`AMO         : ${entreprise ? `${entreprise.nom} (${entreprise.id})` : "<aucune>"}`);
  console.log();

  // --- 3. Garde-fous (mêmes conditions que le service, pour un dry-run lisible) ---
  if (!validation) {
    console.error("ABANDON : aucune validation AMO sur ce parcours. Rien à détacher.");
    await rawClient.end();
    process.exit(1);
  }
  if (validation.statut === StatutValidationAmo.SANS_AMO && !validation.entrepriseAmoId) {
    console.error("ABANDON : ce parcours est déjà « sans AMO ». Rien à faire.");
    await rawClient.end();
    process.exit(1);
  }
  if (parcoursRow.archivedAt) {
    console.error(
      `ABANDON : parcours archivé (archived_at=${parcoursRow.archivedAt.toISOString()}). Le désarchiver d'abord.`
    );
    await rawClient.end();
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
  console.log(`  purge : commentaire, valideeAt, mandataire financier, demande d'arrêt, tracking email`);
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
    await rawClient.end();
    return;
  }

  // --- 5. Application (déléguée au service partagé) ---
  const result = await detacherAmo({ parcoursId });

  if (!result.success) {
    console.error(`ÉCHEC : ${result.error}`);
    await rawClient.end();
    process.exit(1);
  }

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
    `  step/status : ${after?.step}/${after?.status}${result.data.etapeAvancee ? "   (attendu eligibilite/todo)" : "   (inchangé)"}`
  );
  console.log(`  validation  : ${after?.validationStatut}   (attendu sans_amo)`);
  console.log(`  entreprise  : ${after?.entrepriseAmoId ?? "NULL"}   (attendu NULL)`);
  line();

  await rawClient.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  rawClient.end();
  process.exit(1);
});
