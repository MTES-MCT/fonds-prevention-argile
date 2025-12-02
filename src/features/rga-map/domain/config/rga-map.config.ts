/**
 * Configuration de la carte RGA
 */

/**
 * URL du fichier de style MapLibre
 */
export const RGA_MAP_STYLE_URL = "/map/style-carte-argile.json";

/**
 * Centre par défaut (France métropolitaine)
 */
export const DEFAULT_CENTER: [number, number] = [1.86, 46.67];

/**
 * Niveaux de zoom
 */
export const ZOOM = {
  /** Vue France entière */
  france: 4.8,
  /** Vue département */
  departement: 10,
  /** Vue EPCI */
  epci: 11,
  /** Vue commune */
  commune: 12,
  /** Vue bâtiment (après centrage sur adresse) */
  building: 17,
} as const;

/**
 * Limites de la carte (France métropolitaine)
 */
export const MAX_BOUNDS: [[number, number], [number, number]] = [
  [-6, 41], // Sud-Ouest
  [9.5, 52], // Nord-Est
];

/**
 * IDs des sources MapLibre (définis dans style-carte-argile.json)
 */
export const SOURCE_IDS = {
  rnbPoints: "rnb-points",
  rnbFormes: "rnb-formes",
  argile: "argile",
} as const;

/**
 * IDs des layers MapLibre (définis dans style-carte-argile.json)
 */
export const LAYER_IDS = {
  rnbPoints: "points RNB",
  rnbFormes: "formes RNB",
  zonesArgile: "zones argile",
} as const;

/**
 * Source layer pour les tuiles vectorielles RNB
 */
export const RNB_SOURCE_LAYER = "default";

/**
 * Délai avant de centrer la carte sur les coordonnées (ms)
 */
export const FLY_TO_DELAY = 1000;

/**
 * Couleurs des niveaux d'aléa (pour référence, définies aussi dans le style)
 */
export const ALEA_COLORS = {
  fort: "#ff0000",
  moyen: "#ffa500",
  faible: "#ffff00",
  nul: "transparent",
} as const;

/**
 * URL de l'icône marqueur
 */
export const MARKER_ICON_URL = "/map/marker.svg";

/**
 * Taille de l'icône marqueur (px)
 */
export const MARKER_ICON_SIZE = 32;
