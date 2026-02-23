import { Step } from "@/shared/domain/value-objects";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { InfoLogement } from "@/features/backoffice/espace-agent/demandes/domain/types";
import type { Amo } from "@/features/parcours/amo/domain/entities";

/**
 * Un prospect = un particulier qui a créé un compte mais n'a PAS fait de demande à un AMO
 * et dont le logement se situe dans le territoire de l'Allers-Vers
 */
export interface Prospect {
  /** ID du parcours */
  parcoursId: string;

  /** Situation du particulier (prospect, éligible, archivé) */
  situationParticulier: SituationParticulier;

  /** Informations du particulier */
  particulier: {
    prenom: string;
    nom: string;
    email: string;
    telephone: string | null;
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
 * Résultat de la liste des prospects avec les 3 catégories
 */
export interface ProspectsListResult {
  prospects: Prospect[];
  prospectsEligibles: Prospect[];
  prospectsArchives: Prospect[];
  totalProspects: number;
  totalEligibles: number;
  totalArchives: number;
  territoriesCovered: {
    departements: string[];
    epcis: string[];
  };
  /** Indique si au moins un AMO est disponible dans les départements couverts */
  hasAmoDisponible: boolean;
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
 * Informations sur le statut AMO d'un prospect
 */
export type ProspectAmoInfo =
  | { status: "aucun_amo_disponible" }
  | { status: "amo_disponibles"; amosDisponibles: Amo[] };

/**
 * Détail d'un prospect
 */
export interface ProspectDetail extends Prospect {
  /** Informations détaillées du logement pour l'affichage */
  infoLogement: InfoLogement;
  /** Informations sur le statut AMO */
  amoInfo: ProspectAmoInfo;
  /** Historique des étapes */
  stepsHistory: {
    step: Step;
    completedAt?: Date;
  }[];
}
