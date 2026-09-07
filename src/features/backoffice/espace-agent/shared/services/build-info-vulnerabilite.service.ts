import { vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import type { VulnerabiliteSimulation } from "@/shared/database/schema/vulnerabilite-simulations";
import {
  CRITERE_FIELDS,
  QUESTION_LABELS,
  getReponseLabel,
} from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-critere-fields";

export interface InfoVulnerabiliteData {
  scoreGlobal: number;
  completedAt: Date;
  reponses: { label: string; valeur: string }[];
}

/**
 * Construit les données de la carte « Vulnérabilité au RGA » côté agent, à partir du pointeur
 * `parcours_prevention.vulnerabilite_simulation_id`. Lit le score déjà persisté au moment de la
 * simulation (pas de recalcul) — cohérent avec ce que le demandeur a vu.
 */
export async function buildInfoVulnerabilite(
  vulnerabiliteSimulationId: string | null
): Promise<InfoVulnerabiliteData | null> {
  if (!vulnerabiliteSimulationId) return null;

  const simulation = await vulnerabiliteSimulationsRepo.findById(vulnerabiliteSimulationId);
  if (!simulation) return null;

  const reponses = CRITERE_FIELDS.map(({ critereId, field }) => {
    const valeur = simulation[field as keyof VulnerabiliteSimulation] as string | null;
    if (!valeur) return null;
    return { label: QUESTION_LABELS[critereId] ?? critereId, valeur: getReponseLabel(critereId, valeur) };
  }).filter((r): r is { label: string; valeur: string } => r !== null);

  return { scoreGlobal: simulation.scoreGlobal, completedAt: simulation.createdAt, reponses };
}
