export { EligibilityService } from "./eligibility.service";
export { SimulationService } from "./simulation.service";
export {
  evaluateSimulation,
  buildEligibiliteArchiveNote,
  isEligibiliteArchiveReason,
  ELIGIBILITE_ARCHIVE_PREFIX,
  RAISON_ARCHIVAGE_NON_ELIGIBLE,
} from "./eligibilite-archivage.service";
export type { EligibiliteVerdict, OrigineArchivageEligibilite } from "./eligibilite-archivage.service";
export * from "./comparaison-simulations.service";
