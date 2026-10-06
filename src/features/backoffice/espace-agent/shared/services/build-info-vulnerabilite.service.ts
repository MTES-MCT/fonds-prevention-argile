import { vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import {
  CRITERE_FIELDS,
  QUESTION_LABELS,
  getReponseLabel,
  reponsesDepuisColonnes,
} from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-critere-fields";
import {
  categoriserReponses,
  compterPoints,
  getCategorieReponse,
  type ComptePoints,
} from "@/features/vulnerabilite-rga/domain/services/categorisation.service";
import type { CategorieReponse } from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";

export interface InfoVulnerabiliteReponse {
  label: string;
  valeur: string;
  /** null pour l'aléa et l'essence de l'arbre, qui ne portent pas de catégorie. */
  categorie: CategorieReponse | null;
}

export interface InfoVulnerabiliteData {
  compte: ComptePoints;
  completedAt: Date;
  reponses: InfoVulnerabiliteReponse[];
}

/**
 * Construit les données de la carte « Vulnérabilité au RGA » côté agent, à partir du pointeur
 * `parcours_prevention.vulnerabilite_simulation_id`. Les catégories sont relues dans la grille
 * en vigueur, seules les réponses étant persistées.
 */
export async function buildInfoVulnerabilite(
  vulnerabiliteSimulationId: string | null
): Promise<InfoVulnerabiliteData | null> {
  if (!vulnerabiliteSimulationId) return null;

  const simulation = await vulnerabiliteSimulationsRepo.findById(vulnerabiliteSimulationId);
  if (!simulation) return null;

  const reponsesParCritere = reponsesDepuisColonnes(simulation);

  const reponses = CRITERE_FIELDS.flatMap(({ critereId }): InfoVulnerabiliteReponse[] => {
    const valeur = reponsesParCritere[critereId];
    if (!valeur) return [];
    return [
      {
        label: QUESTION_LABELS[critereId] ?? critereId,
        valeur: getReponseLabel(critereId, valeur),
        categorie: getCategorieReponse(critereId, valeur),
      },
    ];
  });

  return {
    compte: compterPoints(categoriserReponses(reponsesParCritere)),
    completedAt: simulation.createdAt,
    reponses,
  };
}
