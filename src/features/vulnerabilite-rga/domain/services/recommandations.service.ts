import { getCategorieConfig } from "../value-objects/grille-ponderation";
import { RECOMMANDATIONS_CATALOGUE, type RecommandationDef } from "../catalogues/recommandations.catalogue";
import type { VulnerabiliteScoreResult } from "./scoring.service";

export interface RecommandationPrioritaire {
  def: RecommandationDef;
  critereId: string;
  score: number;
  poidsGlobal: number;
  /** poidsGlobal × score — sert uniquement au tri, pas affichée telle quelle. */
  priorite: number;
}

const SCORE_MINIMUM_DEFAUT = 25;
const LIMIT_DEFAUT = 6;

/**
 * Sélectionne et priorise les recommandations à afficher, à partir du détail de score
 * déjà calculé par `computeScoreResult`. Formule de priorisation : `poidsGlobal × score`
 * (l'écart au score idéal, qui vaut toujours 0) — strictement dérivée de la grille, sans
 * règle spéciale cachée pour tel ou tel critère.
 *
 * Ne retourne jamais de recommandation pour une catégorie non actionnable (le sol/aléa) :
 * garanti par `recommandations.catalogue.test.ts` (aucune entrée du catalogue ne référence
 * un critère de cette catégorie) et revérifié ici par sécurité.
 */
export function getRecommandationsPrioritaires(
  scoreResult: VulnerabiliteScoreResult,
  options?: { limit?: number; scoreMinimum?: number }
): RecommandationPrioritaire[] {
  const limit = options?.limit ?? LIMIT_DEFAUT;
  const scoreMinimum = options?.scoreMinimum ?? SCORE_MINIMUM_DEFAUT;

  const candidats: RecommandationPrioritaire[] = [];

  for (const detail of scoreResult.details) {
    if (detail.score === null || detail.score <= scoreMinimum) continue;
    if (!detail.reponse) continue;
    if (!getCategorieConfig(detail.categorie).actionnable) continue;

    const def = RECOMMANDATIONS_CATALOGUE.find(
      (r) => r.critereId === detail.critereId && r.reponsesDeclenchantes.includes(detail.reponse!)
    );
    if (!def) continue;

    candidats.push({
      def,
      critereId: detail.critereId,
      score: detail.score,
      poidsGlobal: detail.poidsGlobal,
      priorite: detail.poidsGlobal * detail.score,
    });
  }

  return candidats.sort((a, b) => b.priorite - a.priorite).slice(0, limit);
}
