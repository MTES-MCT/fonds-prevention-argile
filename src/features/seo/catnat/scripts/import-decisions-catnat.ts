/**
 * Import des décisions de catastrophe naturelle (sécheresse), demandes non reconnues comprises
 *
 * Usage:
 *   pnpm seo:import-catnat-decisions
 */

import { decisionsCatnatService } from "../services/decisions-catnat.service";

async function main(): Promise<void> {
  try {
    const bilan = await decisionsCatnatService.importerCocon();

    console.log("Décisions de sécheresse (data.gouv)");
    console.log(`   • Lues dans le jeu de données : ${bilan.lues}`);
    console.log(`   • Communes du cocon SEO       : ${bilan.retenues} (dont ${bilan.nonReconnues} non reconnues)`);
    console.log(`   • Ajoutées                    : ${bilan.ajoutees}`);
    console.log(`   • Retirées                    : ${bilan.retirees}`);
    console.log(`   • Lignes illisibles           : ${bilan.ecartees}`);

    process.exit(0);
  } catch (error) {
    console.error("Erreur lors de l'import des décisions :", error);
    process.exit(1);
  }
}

main();
