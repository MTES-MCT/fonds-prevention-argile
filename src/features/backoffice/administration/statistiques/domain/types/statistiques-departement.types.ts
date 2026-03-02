import type { Step } from "@/shared/domain/value-objects";

/**
 * Statistiques pour un département donné
 */
export interface StatistiquesDepartement {
  codeDepartement: string;
  nomDepartement: string;
  totalParcours: number;

  /** Funnel simulateur (basé sur les données DB, pas Matomo) */
  funnelSimulateur: FunnelDepartement;

  /** Répartition des dossiers par étape du parcours */
  dossiersParEtape: DossierParEtape[];

  /** Raisons d'inéligibilité avec comptage */
  raisonsIneligibilite: RaisonIneligibiliteStats[];

  /** Zones les plus dynamiques (top communes/EPCI) */
  zonesDynamiques: ZoneDynamique[];

  /** Nombre de comptes créés dans ce département */
  nombreComptesCreés: number;

  /** Pourcentage de parcours éligibles */
  pourcentageEligibles: number;
}

export interface FunnelDepartement {
  /** Parcours avec simulation démarrée (rgaSimulationData présent) */
  simulationsDemarrees: number;
  /** Parcours avec simulation complétée (rgaSimulationCompletedAt non null) */
  simulationsCompletees: number;
  /** Parcours déclarés éligibles (situationParticulier = 'eligible') */
  eligibles: number;
  /** Parcours déclarés non éligibles (via prospect_qualifications) */
  nonEligibles: number;
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
