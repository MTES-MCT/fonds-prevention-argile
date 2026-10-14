import { getSession } from "@/features/auth/server";
import { parcoursRepo, vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import type { AdresseChoisie } from "@/shared/adapters/ban";
import {
  categoriserReponses,
  type PointVulnerabilite,
} from "@/features/vulnerabilite-rga/domain/services/categorisation.service";
import { reponsesDepuisColonnes } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-critere-fields";
import type { ReponseAleaRga } from "@/features/vulnerabilite-rga/domain/types/vulnerabilite-reponses.types";
import { adresseChoisieDepuisSimulation } from "../domain/value-objects/adresse-depuis-simulation";
import { estSimulationCorrigeeParAgent } from "./rga-data.service";

export interface MaVulnerabilite {
  completedAt: Date;
  aleaRga: ReponseAleaRga | undefined;
  codeDepartement: string | null;
  mitoyennete: string | undefined;
  points: PointVulnerabilite[];
}

const ALEAS: readonly string[] = ["fort", "moyen", "faible", "nul"];

/**
 * Dernière simulation de vulnérabilité rattachée au parcours du demandeur connecté (ADR-0032).
 * Le parcours vient de la session : aucun identifiant n'entre par le client. Les catégories sont
 * relues dans la grille en vigueur, seules les réponses étant persistées (ADR-0045).
 */
export async function getMaVulnerabilite(): Promise<MaVulnerabilite | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  const parcours = await parcoursRepo.findByUserId(session.userId);
  if (!parcours?.vulnerabiliteSimulationId) return null;

  const simulation = await vulnerabiliteSimulationsRepo.findById(parcours.vulnerabiliteSimulationId);
  if (!simulation) return null;

  const reponses = reponsesDepuisColonnes(simulation);

  return {
    completedAt: simulation.createdAt,
    aleaRga: ALEAS.includes(simulation.aleaRga ?? "") ? (simulation.aleaRga as ReponseAleaRga) : undefined,
    codeDepartement: simulation.codeDepartement,
    mitoyennete: simulation.mitoyennete ?? undefined,
    points: categoriserReponses(reponses),
  };
}

/** Adresse de la simulation d'éligibilité du demandeur, pour préremplir le simulateur de vulnérabilité. */
export async function getAdresseMaSimulation(): Promise<AdresseChoisie | null> {
  const session = await getSession();
  if (!session?.userId) return null;

  const parcours = await parcoursRepo.findByUserId(session.userId);
  if (!parcours) return null;

  // AGENT-first seulement sur une correction complète, comme `getMaSimulation`.
  const rgaData = estSimulationCorrigeeParAgent(parcours)
    ? parcours.rgaSimulationDataAgent
    : parcours.rgaSimulationData;
  return adresseChoisieDepuisSimulation(rgaData);
}
