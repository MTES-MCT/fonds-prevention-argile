// Constantes de tracking Matomo
export const MATOMO_EVENTS = {
  // TODO Mettre ici les événements Matomo  :
  //   LINK_HOMEPAGE: "Lien Page d'accueil",
  // Debug et tests
  DEBUG_TEST_EVENT: "Test Debug Event",
} as const;

export type MatomoEvent = (typeof MATOMO_EVENTS)[keyof typeof MATOMO_EVENTS];
