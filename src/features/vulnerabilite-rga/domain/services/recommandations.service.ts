import {
  CATEGORIES_AFFICHAGE,
  CATEGORIES_A_TRAITER,
  CRITERES_CONFIG,
  type CategorieATraiter,
} from "../value-objects/grille-categorisation";
import { QUESTION_LABELS, getReponseLabel } from "../value-objects/vulnerabilite-critere-fields";
import { RECOMMANDATIONS_CATALOGUE, type RecommandationDef } from "../catalogues/recommandations.catalogue";
import type { PointVulnerabilite } from "./categorisation.service";

export interface PointSansCarte {
  critereId: string;
  question: string;
  reponse: string;
}

export interface SectionRecommandations {
  categorie: CategorieATraiter;
  titre: string;
  recommandations: RecommandationDef[];
  /** Points de la catégorie qu'aucune fiche du catalogue ne couvre : listés sans conseil. */
  pointsSansCarte: PointSansCarte[];
}

function trouverRecommandation(critereId: string, reponse: string): RecommandationDef | undefined {
  return RECOMMANDATIONS_CATALOGUE.find((r) => r.critereId === critereId && r.reponsesDeclenchantes.includes(reponse));
}

/**
 * Regroupe les fiches en trois sections — critiques, vigilance, à vérifier — dans cet ordre,
 * chacune omise si elle est vide. L'ordre des fiches suit celui des questions.
 */
export function getSectionsRecommandations(points: PointVulnerabilite[]): SectionRecommandations[] {
  return CATEGORIES_A_TRAITER.flatMap((categorie) => {
    const recommandations: RecommandationDef[] = [];
    const pointsSansCarte: PointSansCarte[] = [];

    for (const point of points) {
      if (point.categorie !== categorie) continue;

      const def = trouverRecommandation(point.critereId, point.reponse);
      if (def) {
        recommandations.push(def);
      } else {
        pointsSansCarte.push({
          critereId: point.critereId,
          question: QUESTION_LABELS[point.critereId] ?? point.critereId,
          reponse: getReponseLabel(point.critereId, point.reponse),
        });
      }
    }

    if (recommandations.length === 0 && pointsSansCarte.length === 0) return [];
    return [{ categorie, titre: CATEGORIES_AFFICHAGE[categorie].pluriel, recommandations, pointsSansCarte }];
  });
}

/** Réponses classées critique, vigilance ou à vérifier qu'aucune fiche ne couvre (`critereId/reponse`). */
export function getReponsesSansCarte(): string[] {
  return CRITERES_CONFIG.flatMap((critere) =>
    critere.reponses
      .filter((r) => (CATEGORIES_A_TRAITER as readonly string[]).includes(r.categorie ?? ""))
      .filter((r) => !trouverRecommandation(critere.id, r.reponse))
      .map((r) => `${critere.id}/${r.reponse}`)
  );
}
