// Constantes de tracking Matomo
export const MATOMO_EVENTS = {
  // TODO Mettre ici les événements Matomo  :
  // Debug et tests
  DEBUG_TEST_EVENT: "Test Debug Event",

  // Funnel simulateur
  SIMULATEUR_START: "simulateur_start",
  SIMULATEUR_STEP_TYPE_LOGEMENT: "simulateur_step_type_logement",
  SIMULATEUR_STEP_ADRESSE: "simulateur_step_adresse",
  SIMULATEUR_STEP_ETAT_MAISON: "simulateur_step_etat_maison",
  SIMULATEUR_STEP_MITOYENNETE: "simulateur_step_mitoyennete",
  SIMULATEUR_STEP_INDEMNISATION: "simulateur_step_indemnisation",
  SIMULATEUR_STEP_ASSURANCE: "simulateur_step_assurance",
  SIMULATEUR_STEP_PROPRIETAIRE: "simulateur_step_proprietaire",
  SIMULATEUR_STEP_REVENUS: "simulateur_step_revenus",
  SIMULATEUR_RESULT_ELIGIBLE: "simulateur_result_eligible",
  SIMULATEUR_RESULT_NON_ELIGIBLE: "simulateur_result_non_eligible",
} as const;

export type MatomoEvent = (typeof MATOMO_EVENTS)[keyof typeof MATOMO_EVENTS];
