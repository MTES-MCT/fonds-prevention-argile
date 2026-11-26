import { catnatDecisionsRepository } from "@/shared/database/repositories";
import { fetchDecisionsSecheresse } from "../adapters/datagouv";
import { DECISIONS_DATA_GOUV } from "../domain";
import { getAllCommunes } from "../../services/territoires.service";

export interface BilanImportDecisions {
  /** Décisions de sécheresse lisibles dans le jeu de données, toutes communes confondues. */
  lues: number;
  /** Décisions qui concernent une commune du cocon SEO. */
  retenues: number;
  nonReconnues: number;
  ecartees: number;
  ajoutees: number;
  retirees: number;
}

export const decisionsCatnatService = {
  /**
   * Importe les décisions de sécheresse des communes du cocon SEO, refus compris
   */
  async importerCocon(): Promise<BilanImportDecisions> {
    const { decisions, ecartees } = await fetchDecisionsSecheresse();

    const communes = new Set(getAllCommunes().map((commune) => commune.codeInsee));
    const retenues = decisions.filter((decision) => communes.has(decision.codeInsee));

    // Un fichier vidé ou tronqué à la source ne doit pas effacer ce qui est déjà publié sur le site.
    if (retenues.length === 0) {
      throw new Error("Jeu de données des décisions catnat : aucune décision pour les communes suivies");
    }

    const { ajoutees, retirees } = await catnatDecisionsRepository.remplacerSource(
      DECISIONS_DATA_GOUV.source,
      retenues,
      { retirerAbsentes: ecartees === 0 }
    );

    return {
      lues: decisions.length,
      retenues: retenues.length,
      nonReconnues: retenues.filter((decision) => decision.decision === "non_reconnue").length,
      ecartees,
      ajoutees,
      retirees,
    };
  },
};
