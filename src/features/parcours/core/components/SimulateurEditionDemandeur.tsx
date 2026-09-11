"use client";

import { SimulateurEdition } from "@/features/simulateur/components/SimulateurEdition";
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
  return (
    <SimulateurEdition
      nomComplet={nomComplet}
      initialData={initialData}
      audience="demandeur"
      onSave={enregistrerSimulationDemandeurAction}
      redirectAfterSave={ROUTES.particulier.monCompte}
      redirectAfterSaveList={ROUTES.particulier.monCompte}
    />
  );
}
