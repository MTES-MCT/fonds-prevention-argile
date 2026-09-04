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
  SIMULATEUR_STEP_CATASTROPHES_NATURELLES: "simulateur_step_catastrophes_naturelles",
  SIMULATEUR_STEP_ASSURANCE: "simulateur_step_assurance",
  SIMULATEUR_STEP_PROPRIETAIRE: "simulateur_step_proprietaire",
  SIMULATEUR_STEP_REVENUS: "simulateur_step_revenus",
  SIMULATEUR_RESULT_ELIGIBLE: "simulateur_result_eligible",
  SIMULATEUR_RESULT_NON_ELIGIBLE: "simulateur_result_non_eligible",

  // Funnel simulateur de vulnérabilité RGA — noms distincts du simulateur d'éligibilité
  // (préfixe vulnerabilite_) pour pouvoir filtrer proprement les rapports Matomo par simulateur.
  VULNERABILITE_START: "vulnerabilite_start",
  VULNERABILITE_STEP_ADRESSE: "vulnerabilite_step_adresse",
  VULNERABILITE_STEP_PENTE_TERRAIN: "vulnerabilite_step_pente_terrain",
  VULNERABILITE_STEP_RESEAUX_ENTERRES: "vulnerabilite_step_reseaux_enterres",
  VULNERABILITE_STEP_GRAVIER_PROPRETE: "vulnerabilite_step_gravier_proprete",
  VULNERABILITE_STEP_GOUTTIERES: "vulnerabilite_step_gouttieres",
  VULNERABILITE_STEP_ARBRE_PROXIMITE: "vulnerabilite_step_arbre_proximite",
  VULNERABILITE_STEP_ARBRE_ESSENCE: "vulnerabilite_step_arbre_essence",
  VULNERABILITE_STEP_HAIES: "vulnerabilite_step_haies",
  VULNERABILITE_STEP_VEGETATION_PIED_FACADE: "vulnerabilite_step_vegetation_pied_facade",
  VULNERABILITE_STEP_MITOYENNETE: "vulnerabilite_step_mitoyennete",
  VULNERABILITE_STEP_ENSOLEILLEMENT: "vulnerabilite_step_ensoleillement",
  VULNERABILITE_RESULT: "vulnerabilite_result",
} as const;

export type MatomoEvent = (typeof MATOMO_EVENTS)[keyof typeof MATOMO_EVENTS];
