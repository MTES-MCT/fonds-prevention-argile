"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import type { EligibilityChecks } from "../../domain/entities/eligibility-result.entity";

interface SimulateurContextValue {
  /** Titre principal du simulateur */
  formTitle?: string;
  /** Afficher le lien "Besoin d'aide ?" */
  showHelpLink?: boolean;
  /** Données initiales du demandeur (mode édition, pour comparaison) */
  initialData?: RGASimulationData | null;
  /** ID du dossier ou parcours (mode édition, pour la sauvegarde) */
  dossierId?: string;
  /** URL de redirection après sauvegarde si éligible (page de détail) */
  redirectAfterSave?: string;
  /** URL de redirection après sauvegarde si non éligible (page de liste) */
  redirectAfterSaveList?: string;
  /**
   * Mode embarqué : le simulateur est rendu sans son layout extérieur déjà encapsulé dans un layout parent (ex: wizard invitation AMO AV).
   */
  embedded?: boolean;
  /**
   * Callback appelé par le bouton "Précédent" quand le simulateur ne peut pas
   * reculer en interne (1ère étape, history vide). Typiquement utilisé en mode
   * embarqué pour revenir à l'étape précédente du wizard parent.
   */
  onBackBeyondFirstStep?: () => void;
  /**
   * Composant à rendre à l'étape RESULTAT à la place de ResultEdition / ResultEligible.
   * Si défini (typiquement en mode embedded), il prend le contrôle complet de
   * l'écran de fin de simulation et reçoit les checks/isEligible + callbacks.
   */
  customResultComponent?: (props: {
    checks: EligibilityChecks;
    isEligible: boolean;
    onBack: () => void;
    onRestart: () => void;
  }) => ReactNode;
}

const SimulateurContext = createContext<SimulateurContextValue>({});

export function SimulateurProvider({ children, ...value }: SimulateurContextValue & { children: ReactNode }) {
  return <SimulateurContext.Provider value={value}>{children}</SimulateurContext.Provider>;
}

export function useSimulateurContext(): SimulateurContextValue {
  return useContext(SimulateurContext);
}
