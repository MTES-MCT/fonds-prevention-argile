// Export des types partagés
export type { ActionResult, ActionData } from "./types";

// Actions de préremplissage (REST)
export {
  getDemarcheSchema,
  getDemarcheStats,
  createTestDossier,
  createPrefillDossier,
  generatePrefillUrl,
  validatePrefillData,
} from "./prefill.actions";

// Actions de gestion des démarches (GraphQL)
export {
  getDemarcheDetails,
  getDossiers,
  getDossierByNumber,
  getDemarcheStatistics,
  getPrefilledDossiers,
} from "./demarches.actions";
