import { unstable_rethrow } from "next/navigation";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { AdresseChoisie } from "@/shared/adapters/ban";
import type { ActionResult } from "@/shared/types/action-result.types";
import { adresseChoisieDepuisSimulation } from "@/features/parcours/core/domain/value-objects/adresse-depuis-simulation";
import { formatNomComplet } from "@/shared/utils";
import { getDossierSimulationData } from "./edition-simulation.service";

/**
 * Qui peut faire le test de vulnérabilité pour le compte d'un demandeur (au téléphone).
 * Les rôles de suivi d'un dossier : le super-admin reste en lecture seule, et l'analyste comme
 * l'administrateur ne suivent aucun demandeur en particulier.
 */
export const ROLES_TEST_VULNERABILITE_AGENT: readonly UserRole[] = [
  UserRole.AMO,
  UserRole.ALLERS_VERS,
  UserRole.AMO_ET_ALLERS_VERS,
];

export function peutFaireTestVulnerabilitePourDemandeur(role: UserRole): boolean {
  return ROLES_TEST_VULNERABILITE_AGENT.includes(role);
}

export interface DossierTestVulnerabilite {
  parcoursId: string;
  nomDemandeur: string;
  /** Adresse de la simulation du dossier : l'agent ne la ressaisit pas. */
  adresse: AdresseChoisie | null;
}

/**
 * Résout le dossier visé (id de validation AMO ou id de parcours d'un prospect) et vérifie les droits.
 *
 * Le périmètre est celui de l'édition de simulation (`getDossierSimulationData`) : ownership de
 * l'entreprise AMO, ou territoire pour un dossier sans AMO. Le test ne doit pas s'ouvrir sur un
 * dossier que l'agent ne peut pas corriger.
 */
export async function resoudreDossierTestVulnerabilite(id: string): Promise<ActionResult<DossierTestVulnerabilite>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non authentifié" };

    if (!peutFaireTestVulnerabilitePourDemandeur(user.role as UserRole)) {
      return { success: false, error: "Action réservée aux AMO et aux Allers-vers" };
    }

    const dossier = await getDossierSimulationData(id);
    if (!dossier.success) return { success: false, error: dossier.error };

    return {
      success: true,
      data: {
        parcoursId: dossier.data.parcoursId,
        nomDemandeur: formatNomComplet(dossier.data.prenom, dossier.data.nom),
        adresse: adresseChoisieDepuisSimulation(dossier.data.rgaData),
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[resoudreDossierTestVulnerabilite] échec", error);
    return { success: false, error: "Erreur lors de la lecture du dossier" };
  }
}
