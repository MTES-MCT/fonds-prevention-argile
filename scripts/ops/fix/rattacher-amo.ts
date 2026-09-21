/**
 * Rerattache une AMO aux parcours détachés à tort, en département où elle est obligatoire.
 *
 * Contexte
 * --------
 * « Ne plus accompagner » (menu Gérer du détail dossier) détachait sans vérifier le
 * département : validation `sans_amo`, entreprise à NULL, y compris là où l'arrêté impose
 * une AMO. Le demandeur s'y retrouvait sans accompagnateur, et rien ne pouvait revenir en
 * arrière — l'AMO perdant l'accès au dossier à la seconde du clic. La garde est posée depuis
 * (`arreterAccompagnementAction`) ; ce script répare les dossiers déjà dans cet état.
 *
 * Mince wrapper CLI autour du service `rattacherAmo`
 * (`src/features/parcours/amo/services/rattachement-amo.service.ts`), qui porte les gardes.
 *
 * Ce que fait le rattachement :
 *   - validation : entreprise restaurée, statut -> en_attente, attributionMode -> auto_*
 *   - étape / statut du parcours : INCHANGÉS (un dossier au diagnostic y reste)
 *   - aucun email, aucun token : l'AMO retrouve le dossier dans son listing
 *
 * Statut cible `en_attente` et non `logement_eligible` : le détachement avait purgé
 * `validee_at`, on ne sait donc plus si l'AMO avait validé — elle re-confirme.
 *
 * Niveaux d'engagement
 *   (rien)     dry-run : inventaire + plan, aucune écriture
 *   --apply    applique le rattachement
 *
 * Ciblage
 *   (rien)                 inventaire de tous les parcours concernés
 *   --parcours-id=<uuid>   cible un parcours précis
 *
 * Usage
 *   pnpm fix:rattacher-amo                             # inventaire (dry-run)
 *   pnpm fix:rattacher-amo --apply                     # répare tout l'inventaire
 *   pnpm fix:rattacher-amo --parcours-id=<uuid> --apply
 *
 * NB : action ops (pas un agent connecté) — pas d'entrée d'audit `parcours_actions`,
 * comme `fix:detacher-amo`. La sortie du script fait foi, la conserver.
 *
 * Pré-requis : .env.local (ou vars Scalingo) avec la config DB.
 */

import "../lib/env";
import { rawClient } from "@/shared/database/client";
import { listerDossiersARattacher } from "@/features/backoffice/administration/diagnostics/services/amo-a-rattacher.service";
import { rattacherAmo } from "@/features/parcours/amo/services/rattachement-amo.service";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");

const line = () => console.log("-".repeat(90));

async function main() {
  line();
  console.log(`RATTACHEMENT AMO — ${APPLY ? "APPLY (écriture)" : "DRY-RUN (aucune écriture)"}`);
  line();

  const candidats = await listerDossiersARattacher(PARCOURS_ID);

  if (candidats.length === 0) {
    console.log("Aucun parcours à rattacher.");
    if (PARCOURS_ID) {
      console.log();
      console.log(`Le parcours ${PARCOURS_ID} ne remplit pas les critères. Causes possibles :`);
      console.log("  - il est archivé ou complété (le désarchiver d'abord) ;");
      console.log("  - il a déjà une AMO rattachée, ou n'est pas en statut « sans_amo » ;");
      console.log("  - son département est en AMO facultative (l'autonomie y est légitime) ;");
      console.log("  - sa commune est introuvable dans la simulation.");
    }
    await rawClient.end();
    return;
  }

  const nbGeles = candidats.filter((c) => c.gele).length;
  const detailGeles = nbGeles > 0 ? `, dont ${nbGeles} gelé${nbGeles > 1 ? "s" : ""} (formulaire déposé)` : "";

  console.log(`${candidats.length} parcours concerné(s)${detailGeles} :`);
  console.log();
  for (const c of candidats) {
    const marque = c.gele ? "  GELE" : "";
    const cible = c.amoCible ? `${c.amoCible.nom} (${c.amoCible.origine})` : "AUCUNE AMO TROUVEE";
    console.log(`  ${c.parcoursId}  dept ${c.dept.padEnd(3)}  ${c.currentStep.padEnd(12)}  ${cible}${marque}`);
  }
  console.log();
  const parDept = candidats.reduce<Record<string, number>>((acc, c) => {
    acc[c.dept] = (acc[c.dept] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    "Par département : " +
      Object.entries(parDept)
        .sort((a, b) => b[1] - a[1])
        .map(([d, n]) => `${d}=${n}`)
        .join("  ")
  );
  line();

  if (!APPLY) {
    console.log("Dry-run : relancer avec --apply pour rattacher.");
    await rawClient.end();
    return;
  }

  let ok = 0;
  const echecs: string[] = [];
  for (const c of candidats) {
    const result = await rattacherAmo({ parcoursId: c.parcoursId });
    if (result.success) {
      ok += 1;
      console.log(`  OK   ${c.parcoursId}  -> ${result.data.amoNom} (source : ${result.data.origine})`);
    } else {
      echecs.push(`${c.parcoursId} : ${result.error}`);
      console.log(`  SKIP ${c.parcoursId}  ${result.error}`);
    }
  }

  line();
  console.log(`Rattachés : ${ok}   Ignorés : ${echecs.length}`);
  if (echecs.length > 0) {
    console.log();
    console.log("Détail des dossiers ignorés :");
    for (const e of echecs) console.log(`  - ${e}`);
  }
  line();

  await rawClient.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  rawClient.end();
  process.exit(1);
});
