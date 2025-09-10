// Export de toutes les actions liées à Démarches Simplifiées
export {
  getDemarcheSchema,
  getDemarcheStats,
  createTestDossier,
  createPrefillDossier,
  generatePrefillUrl,
  validatePrefillData,
} from "./prefill.actions";

// Export des types si besoin
export type { ActionResult } from "./prefill.actions";
