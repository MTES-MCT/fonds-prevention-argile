import { Step } from "@/shared/domain/value-objects";

/**
 * Un prospect = un particulier qui a créé un compte mais n'a PAS fait de demande à un AMO
 * et dont le logement se situe dans le territoire de l'Allers-Vers
 */
export interface Prospect {
  /** ID du parcours */
  parcoursId: string;

  /** Informations du particulier */
  particulier: {
    prenom: string;
    nom: string;
    email: string;
  };

  /** Informations du logement */
  logement: {
    adresse: string;
    commune: string;
    codePostal: string;
    codeDepartement: string;
    codeEpci?: string;
  };

  /** Étape actuelle du parcours */
  currentStep: Step;

  /** Date de création du compte */
  createdAt: Date;

  /** Date de dernière mise à jour */
  updatedAt: Date;

  /** Nombre de jours depuis la dernière action */
  daysSinceLastAction: number;
}

/**
 * Résultat de la liste des prospects
 */
export interface ProspectsListResult {
  prospects: Prospect[];
  totalCount: number;
  territoriesCovered: {
    departements: string[];
    epcis: string[];
  };
}

/**
 * Filtres pour la liste des prospects
 */
export interface ProspectFilters {
  /** Filtrer par commune */
  commune?: string;

  /** Filtrer par étape */
  step?: Step;

  /** Filtrer par ancienneté (jours max depuis dernière action) */
  maxDaysSinceAction?: number;

  /** Recherche par nom/prénom */
  search?: string;
}

/**
 * Détail d'un prospect
 */
export interface ProspectDetail extends Prospect {
  /** Historique des étapes */
  stepsHistory: {
    step: Step;
    completedAt?: Date;
  }[];
}
