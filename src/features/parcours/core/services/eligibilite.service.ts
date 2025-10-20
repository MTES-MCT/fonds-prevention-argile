import type { ActionResult } from "@/shared/types";
import { Step } from "../domain/value-objects/step";
import { RGAFormData } from "@/features/simulateur-rga";
// TODO: Importer depuis dossiers-ds/ quand ce sera prêt
// import { createDossierEligibiliteDS } from "@/features/parcours/dossiers-ds/services/dossier-ds.service";

/**
 * Service de gestion de l'éligibilité
 */

interface EligibiliteResult {
  dossierUrl: string;
  dossierNumber: number;
  dossierId: string;
  message: string;
}

/**
 * Crée un dossier d'éligibilité avec les données RGA
 */
export async function createEligibiliteDossier(
  userId: string,
  rgaData: Partial<RGAFormData>
): Promise<ActionResult<EligibiliteResult>> {
  // TODO: Implémenter quand dossiers-ds/ sera prêt
  // 1. Valider les données RGA
  // 2. Récupérer l'AMO choisie
  // 3. Mapper RGA → DS
  // 4. Créer le dossier DS
  // 5. Enregistrer dans le parcours

  throw new Error("À implémenter avec dossiers-ds/");
}

/**
 * Vérifie si l'utilisateur peut créer un dossier d'éligibilité
 */
export async function canCreateEligibiliteDossier(
  userId: string
): Promise<boolean> {
  const parcours = await getParcoursComplet(userId);

  // Ne peut pas créer si déjà à l'étape éligibilité ou plus loin
  if (parcours?.parcours?.currentStep === Step.ELIGIBILITE) {
    return false;
  }

  return true;
}
