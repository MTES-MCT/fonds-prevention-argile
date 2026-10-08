import {
  CATEGORIES_AFFICHAGE,
  CATEGORIES_A_TRAITER,
  CRITERES_CONFIG,
  type CategorieATraiter,
} from "../value-objects/grille-categorisation";
import { RECOMMANDATIONS_CATALOGUE, type RecommandationDef } from "../catalogues/recommandations.catalogue";
import type { PointVulnerabilite } from "./categorisation.service";

export interface SectionRecommandations {
  categorie: CategorieATraiter;
  titre: string;
  explication?: string;
  recommandations: RecommandationDef[];
}

function trouverRecommandation(critereId: string, reponse: string): RecommandationDef | undefined {
  return RECOMMANDATIONS_CATALOGUE.find((r) => r.critereId === critereId && r.reponsesDeclenchantes.includes(reponse));
}

/**
 * Regroupe les fiches en trois sections — critiques, vigilance, à surveiller — dans cet ordre,
 * chacune omise si elle est vide. L'ordre des fiches suit celui des questions.
 */
export function getSectionsRecommandations(points: PointVulnerabilite[]): SectionRecommandations[] {
  return CATEGORIES_A_TRAITER.flatMap((categorie) => {
    // Chaque réponse à traiter a sa fiche (garde-fou : `getReponsesSansCarte`), une fiche vaut donc un point.
    const recommandations = points
      .filter((point) => point.categorie === categorie)
      .flatMap((point) => trouverRecommandation(point.critereId, point.reponse) ?? []);

    if (recommandations.length === 0) return [];
    const { pluriel, explication } = CATEGORIES_AFFICHAGE[categorie];
    return [{ categorie, titre: pluriel, explication, recommandations }];
  });
}

/** Réponses classées critique, vigilance ou à surveiller qu'aucune fiche ne couvre (`critereId/reponse`). */
export function getReponsesSansCarte(): string[] {
  return CRITERES_CONFIG.flatMap((critere) =>
    critere.reponses
      .filter((r) => (CATEGORIES_A_TRAITER as readonly string[]).includes(r.categorie ?? ""))
      .filter((r) => !trouverRecommandation(critere.id, r.reponse))
      .map((r) => `${critere.id}/${r.reponse}`)
  );
}
