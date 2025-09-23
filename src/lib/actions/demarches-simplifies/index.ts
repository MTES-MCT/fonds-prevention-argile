// Actions de production (utilisées dans le parcours)
export { createPrefillDossier, validatePrefillData } from "./prefill.actions";

// Actions de test (uniquement pour /test/ds-prefill)
export {
  getDemarcheSchema,
  createTestDossier,
  generateTestPrefillUrl as generatePrefillUrl, // alias pour compatibilité
  testValidatePrefillData,
} from "./test.actions";

// Actions GraphQL (si encore utilisées)
export {
  getDemarcheDetails,
  getDossiers,
  getDossierByNumber,
  getDemarcheStatistics,
  getPrefilledDossiers,
} from "./demarches.actions";
