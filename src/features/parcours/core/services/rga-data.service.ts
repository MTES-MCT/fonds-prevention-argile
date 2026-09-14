import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { isSimulationComplete } from "@/features/simulateur/domain/rules/navigation";

interface ParcoursRGA {
  rgaSimulationData?: RGASimulationData | null;
  rgaSimulationDataAgent?: RGASimulationData | null;
}

/**
 * Retourne les données RGA effectives d'un parcours :
 * - Données agent si elles existent (prioritaires, éditées par AMO ou allers-vers)
 * - Sinon données initiales du simulateur
 */
export function getEffectiveRGAData(parcours: ParcoursRGA): RGASimulationData | null {
  return parcours.rgaSimulationDataAgent ?? parcours.rgaSimulationData ?? null;
}

/**
 * Une simulation d'agent ne vaut correction que **complète**. Celle d'un dossier créé
 * par un Aller-vers ne porte que l'adresse : la compter fermait au demandeur le
 * simulateur public *et* son écran d'édition, sans rien lui laisser pour en sortir.
 * Même critère que la promotion au rattachement FranceConnect et que l'étape 3 de la
 * migration, pour que les trois ne puissent pas diverger.
 */
export function estSimulationCorrigeeParAgent(parcours: ParcoursRGA): boolean {
  return Boolean(parcours.rgaSimulationDataAgent && isSimulationComplete(parcours.rgaSimulationDataAgent));
}
