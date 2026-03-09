import type { Step } from "@/shared/domain/value-objects";

/**
 * Statistiques pour un département donné
 */
export interface StatistiquesDepartement {
  codeDepartement: string;
  nomDepartement: string;

  /** Matomo : nombre de simulations commencées (event simulateur_step_adresse) */
  simulationsCommencees: number;

  /** Matomo : nombre de simulations terminées (events result_eligible + result_non_eligible) */
  simulationsTerminees: number;

  /** Indique si les données Matomo sont disponibles (false = dimension pas encore configurée ou pas de données) */
  matomoDataAvailable: boolean;

  /** BDD : nombre de comptes créés dans ce département */
  nombreComptesCreés: number;

  /** Calculé : nombreComptesCreés / simulationsCommencées * 100 */
  tauxConversionSimuCompte: number;

  /** Répartition des dossiers par étape du parcours */
  dossiersParEtape: DossierParEtape[];

  /** Raisons d'inéligibilité avec comptage */
  raisonsIneligibilite: RaisonIneligibiliteStats[];

  /** Zones les plus dynamiques (top communes/EPCI) */
  zonesDynamiques: ZoneDynamique[];
}

export interface DossierParEtape {
  etape: Step;
  label: string;
  count: number;
}

export interface RaisonIneligibiliteStats {
  raison: string;
  label: string;
  count: number;
}

export interface ZoneDynamique {
  nom: string;
  type: "commune" | "epci";
  count: number;
}

/**
 * Département disponible dans le sélecteur (avec activité)
 */
export interface DepartementDisponible {
  code: string;
  nom: string;
  nombreParcours: number;
}
