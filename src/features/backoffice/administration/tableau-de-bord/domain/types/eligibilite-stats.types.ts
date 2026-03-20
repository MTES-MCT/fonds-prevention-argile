import type { StatAvecVariation, CommuneSimulationsStats } from "./tableau-de-bord.types";
import type { TrancheRevenuRga } from "@/features/simulateur/domain/types/rga-revenus.types";

export interface EligibiliteTopDepartement {
  codeDepartement: string;
  nomDepartement: string;
  simulations: number;
}

export interface EligibiliteStats {
  /** Micro-fissures (sur simulations éligibles uniquement) */
  avecMicroFissures: StatAvecVariation;
  sansMicroFissures: StatAvecVariation;

  /** Indemnisation antérieure (sur simulations éligibles uniquement) */
  dejaIndemnisees: StatAvecVariation;
  nonIndemnisees: StatAvecVariation;

  /** Répartition par tranche de revenus (sur toutes les simulations) */
  tranchesRevenus: Record<TrancheRevenuRga, StatAvecVariation>;

  /** Top 5 départements par nombre de simulations */
  topDepartements: EligibiliteTopDepartement[];

  /** Top 5 communes par nombre de simulations */
  topCommunes: CommuneSimulationsStats[];
}
