/**
 * Rapproche les dossiers DN DÉPOSÉS de leur parcours, via l'annotation « lien FPA » qui porte
 * le `parcoursId` (ADR-0027). Répare les parcours dont le pointeur a été perdu — mauvais compte
 * DN, dossier rempli depuis le poste de l'AMO, brouillon purgé, pointeur supprimé par l'ancien
 * reset — sans que le demandeur ait quoi que ce soit à faire.
 *
 * Ne traite QUE les dossiers déposés : un brouillon est invisible de l'API instructeur.
 *
 * Verdicts :
 *   rattachement               le parcours n'a pas de dossier confirmé → repointage
 *   deja_a_jour                le pointeur vise déjà ce dossier
 *   conflit_autre_parcours     numéro déjà rattaché ailleurs → jamais volé, à examiner
 *   conflit_dossier_confirme   le parcours a déjà un dossier déposé sous un autre numéro
 *   conflit_plusieurs_deposes  plusieurs dossiers déposés visent ce parcours
 *   sans_annotation            dossier créé hors FPA → rattachement manuel (numéro à saisir)
 *   parcours_inconnu           annotation pointant un parcours supprimé
 *
 * Usage :
 *   pnpm ds:reconcilier                          # dry-run, éligibilité, tout l'historique
 *   pnpm ds:reconcilier --step=diagnostic        # autre étape
 *   pnpm ds:reconcilier --since=2026-08-01       # delta seulement (plus rapide)
 *   pnpm ds:reconcilier --apply                  # applique les rattachements
 *
 * Le premier passage doit être lancé SANS `--since` : un dossier déposé il y a des mois et
 * jamais modifié depuis resterait invisible d'un balayage incrémental.
 *
 * Après application : relancer une synchro pour recopier l'état réel des dossiers repointés.
 */

import { createOpsDb } from "../lib/db";
import { reconcilierDemarche } from "@/features/parcours/dossiers-ds/services/reconciliation.service";
import { resolveDemarcheNumberForStep } from "@/features/parcours/dossiers-ds/services/pieces-justificatives.service";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { createRedactor } from "../lib/anonymize";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const ANONYMIZE = !hasFlag("no-anonymize");
const SINCE = getArg("since");
const STEP = (getArg("step") ?? Step.ELIGIBILITE) as Step;

const { client } = createOpsDb();
const { redactUuid } = createRedactor(ANONYMIZE);

async function main() {
  const demarcheNumber = resolveDemarcheNumberForStep(STEP);

  console.log("=".repeat(72));
  console.log(`RÉCONCILIATION DOSSIERS DN — ${APPLY ? "APPLY" : "DRY-RUN"}${ANONYMIZE ? " (anonymisé)" : ""}`);
  console.log("=".repeat(72));
  console.log(`Étape : ${STEP} — démarche ${demarcheNumber}`);
  console.log(SINCE ? `Modifiés depuis : ${SINCE}` : "Périmètre : TOUS les dossiers de la démarche");
  console.log();

  const rapport = await reconcilierDemarche({
    demarcheNumber,
    step: STEP,
    updatedSince: SINCE ? new Date(SINCE).toISOString() : undefined,
    apply: APPLY,
  });

  if (!rapport.scanComplet) {
    console.error("=".repeat(72));
    console.error(`SCAN INCOMPLET — ${rapport.scanIncompletRaison} (après ${rapport.pagesLues} page(s))`);
    console.error(
      "Aucune écriture n'a été faite : un dossier manquant pourrait transformer un conflit en\n" +
        "rattachement automatique erroné. Relancer une fois DN de nouveau joignable."
    );
    console.error("=".repeat(72));
    await client.end();
    process.exit(1);
  }

  console.log(`Dossiers déposés examinés : ${rapport.lignes.length} (${rapport.pagesLues} page(s), scan complet)`);
  console.log();
  for (const [verdict, n] of Object.entries(rapport.totaux)) {
    if (n > 0) console.log(`  ${verdict.padEnd(26)} : ${n}`);
  }
  console.log();

  const aVoir = rapport.lignes.filter((l) => l.verdict !== "deja_a_jour" && l.verdict !== "sans_annotation");
  if (aVoir.length > 0) {
    console.log("--- DÉTAIL (hors « déjà à jour » et « sans annotation ») ---");
    for (const l of aVoir) {
      const avant = l.pointeurAvant ? `#${l.pointeurAvant}` : "aucun pointeur";
      console.log(`  ${l.verdict.padEnd(26)} #${l.dsNumber} (${l.state}) ${avant} → ${redactUuid(l.parcoursId ?? "")}`);
    }
    console.log();
  }

  const sansAnnotation = rapport.lignes.filter((l) => l.verdict === "sans_annotation");
  if (sansAnnotation.length > 0) {
    console.log("--- SANS LIEN FPA (créés hors de notre parcours, à rattacher par leur numéro) ---");
    for (const l of sansAnnotation) {
      console.log(`  #${l.dsNumber} (${l.state})`);
    }
    console.log();
  }

  if (APPLY) {
    console.log(`Rattachements appliqués : ${rapport.rattachementsAppliques}`);
    console.log("Relancer une synchro pour recopier l'état réel des dossiers repointés.");
  } else {
    console.log(`Mode dry-run — aucune écriture. ${rapport.totaux.rattachement} rattachement(s) proposé(s).`);
  }

  await client.end();
}

main().catch(async (err) => {
  console.error("Erreur fatale :", err);
  await client.end();
  process.exit(1);
});
