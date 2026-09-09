"use client";

import { SimulateurEdition } from "@/features/simulateur/components/SimulateurEdition";
import { updateSimulationDataAction } from "../actions/update-simulation-data.action";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

interface SimulateurEditionAgentProps {
  nomComplet: string;
  initialData: RGASimulationData | null;
  /** ID de validation AMO (dossier/demande) ou de parcours (prospect). */
  dossierId: string;
  redirectAfterSave: string;
  redirectAfterSaveList: string;
}

/**
 * Branche l'écran d'édition partagé sur la colonne agent du dossier
 * (`rgaSimulationDataAgent`). Wrapper côté back-office pour que le simulateur
 * n'ait pas à connaître les actions de l'espace agent.
 */
export function SimulateurEditionAgent({ dossierId, ...props }: SimulateurEditionAgentProps) {
  return (
    <SimulateurEdition
      {...props}
      dossierId={dossierId}
      audience="agent"
      onSave={(rgaData) => updateSimulationDataAction(dossierId, rgaData)}
    />
  );
}
