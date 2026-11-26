/**
 * Import des décisions de catastrophe naturelle (sécheresse), demandes non reconnues comprises
 *
 * Usage:
 *   pnpm seo:import-catnat-decisions
 */

import { decisionsCatnatService } from "../services/decisions-catnat.service";
import { catnatService } from "../services/catnat.service";

async function main(): Promise<void> {
  try {
    const bilan = await decisionsCatnatService.importerCocon();

    console.log("Décisions de sécheresse (data.gouv)");
    console.log(`   • Lues dans le jeu de données : ${bilan.lues}`);
    console.log(`   • Communes du cocon SEO       : ${bilan.retenues} (dont ${bilan.nonReconnues} non reconnues)`);
    console.log(`   • Ajoutées                    : ${bilan.ajoutees}`);
    console.log(`   • Retirées                    : ${bilan.retirees}`);
    console.log(`   • Lignes illisibles           : ${bilan.ecartees}`);

    const comparaison = await catnatService.comparerSources();
    if (comparaison) {
      console.log("\nComparaison avec Géorisques, depuis le début du jeu de données");
      console.log(`   • Reconnaissances identiques  : ${comparaison.identiques}`);
      console.log(`   • À un jour d'écart           : ${comparaison.ecartUnJour}`);
      console.log(`   • Dans Géorisques seulement   : ${comparaison.georisquesSeul}`);
      console.log(`   • Dans data.gouv seulement    : ${comparaison.datagouvSeul}`);
      console.log(`   • Dernier JO Géorisques       : ${comparaison.dernierJoGeorisques}`);
      console.log(`   • Dernier JO data.gouv        : ${comparaison.dernierJoDatagouv}`);
      if (comparaison.sourceEnRetard) {
        console.log(
          `   • Source en retard            : ${comparaison.sourceEnRetard} (${comparaison.retardJours} jours)`
        );
      }
    }

    // Import partiel : les lignes lisibles sont écrites, mais l'appelant doit le voir.
    process.exit(bilan.ecartees > 0 ? 1 : 0);
  } catch (error) {
    console.error("Erreur lors de l'import des décisions :", error);
    process.exit(1);
  }
}

main();
