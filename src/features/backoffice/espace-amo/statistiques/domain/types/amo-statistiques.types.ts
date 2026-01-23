import { Step } from "@/shared/domain/value-objects";

/**
 * Types pour les statistiques de l'espace AMO
 */

/**
 * Indicateurs clés pour l'AMO
 */
export interface AmoIndicateursCles {
  /** Nb de dossiers en cours d'accompagnement (demande acceptée + statut LOGEMENT_ELIGIBLE) */
  nombreDossiersEnCoursAccompagnement: number;
  /** Nb total de demandes d'accompagnement traitées */
  nombreDemandesAccompagnement: {
    total: number;
    acceptees: number;
    refusees: number;
  };
}

/**
 * Répartition des dossiers par étape du parcours
 */
export interface RepartitionParEtape {
  etape: Step;
  label: string;
  count: number;
}

/**
 * Catégories de revenus pour la répartition
 * Note: "supérieure" est exclue du dispositif
 */
export type CategorieRevenu = "très modeste" | "modeste" | "intermédiaire";

/**
 * Répartition des dossiers par catégorie de revenus
 */
export interface RepartitionParRevenu {
  tresModeste: number;
  modeste: number;
  intermediaire: number;
}

/**
 * Commune avec son nombre de demandeurs
 */
export interface CommuneStats {
  commune: string;
  codeDepartement: string;
  nombreDemandeurs: number;
}

/**
 * Statistiques complètes de l'AMO
 */
export interface AmoStatistiques {
  indicateursCles: AmoIndicateursCles;
  repartitionParEtape: RepartitionParEtape[];
  repartitionParRevenu: RepartitionParRevenu;
  topCommunes: CommuneStats[];
}
