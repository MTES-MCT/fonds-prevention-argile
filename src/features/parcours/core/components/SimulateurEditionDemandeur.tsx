"use client";

import { SimulateurEdition } from "@/features/simulateur/components/SimulateurEdition";
import { useRGAStore } from "@/features/simulateur";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { enregistrerSimulationDemandeurAction } from "../actions/enregistrer-simulation-demandeur.actions";

/**
 * Branche l'écran d'édition partagé sur la simulation du demandeur connecté.
 * Aucun identifiant n'est passé : l'action résout le parcours par la session.
 */
export function SimulateurEditionDemandeur({
  nomComplet,
  initialData,
}: {
  nomComplet: string;
  initialData: RGASimulationData | null;
}) {
  const clearRGA = useRGAStore((state) => state.clearRGA);

  // Le cache local est périmé dès que la correction est en base. Le laisser faisait
  // rouvrir, au retour sur /mon-compte, un arbitrage entre la version qu'on vient
  // d'enregistrer et celle d'avant — cette dernière présélectionnée.
  const enregistrer = async (rgaData: RGASimulationData) => {
    const result = await enregistrerSimulationDemandeurAction(rgaData);
    if (result.success) clearRGA();
    return result;
  };

  return (
    <SimulateurEdition
      nomComplet={nomComplet}
      initialData={initialData}
      audience="demandeur"
      onSave={enregistrer}
      redirectAfterSave={ROUTES.particulier.monCompte}
      redirectAfterSaveList={ROUTES.particulier.monCompte}
    />
  );
}
