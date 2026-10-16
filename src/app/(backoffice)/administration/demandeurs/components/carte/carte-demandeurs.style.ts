import type * as maplibregl from "maplibre-gl";
import { LAYER_IDS } from "@/features/rga-map/domain/config";

export const SOURCE_DEMANDEURS = "demandeurs-communes";

export const COUCHES_DEMANDEURS = {
  groupes: "demandeurs-groupes",
  groupesNombre: "demandeurs-groupes-nombre",
  communes: "demandeurs-communes",
  communesNombre: "demandeurs-communes-nombre",
} as const;

// Peint en WebGL : les variables CSS du DSFR n'y sont pas lisibles, d'où les valeurs du bleu France.
const BLEU_FRANCE = "#000091";
const BLEU_FRANCE_CLAIR = "#6A6AF4";
const TEXTE_SUR_BLEU = "#FFFFFF";
const POLICE = ["Noto Sans Regular"];

// Le rayon suit le nombre de demandeurs, pas le nombre de communes regroupées.
const RAYON_SELON_DEMANDEURS: maplibregl.ExpressionSpecification = [
  "step",
  ["get", "demandeurs"],
  12,
  5,
  16,
  20,
  22,
  50,
  28,
  200,
  36,
];

export const OPTIONS_SOURCE: Omit<maplibregl.GeoJSONSourceSpecification, "data"> = {
  type: "geojson",
  cluster: true,
  clusterRadius: 50,
  // Au-delà, chaque commune garde son propre point.
  clusterMaxZoom: 11,
  clusterProperties: { demandeurs: ["+", ["get", "demandeurs"]] },
};

export const COUCHES: maplibregl.LayerSpecification[] = [
  {
    id: COUCHES_DEMANDEURS.groupes,
    type: "circle",
    source: SOURCE_DEMANDEURS,
    filter: ["has", "point_count"],
    paint: {
      "circle-color": BLEU_FRANCE,
      "circle-opacity": 0.85,
      "circle-radius": RAYON_SELON_DEMANDEURS,
      "circle-stroke-width": 2,
      "circle-stroke-color": TEXTE_SUR_BLEU,
    },
  },
  {
    id: COUCHES_DEMANDEURS.groupesNombre,
    type: "symbol",
    source: SOURCE_DEMANDEURS,
    filter: ["has", "point_count"],
    layout: { "text-field": ["to-string", ["get", "demandeurs"]], "text-font": POLICE, "text-size": 13 },
    paint: { "text-color": TEXTE_SUR_BLEU },
  },
  {
    id: COUCHES_DEMANDEURS.communes,
    type: "circle",
    source: SOURCE_DEMANDEURS,
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": BLEU_FRANCE_CLAIR,
      "circle-opacity": 0.9,
      "circle-radius": RAYON_SELON_DEMANDEURS,
      "circle-stroke-width": 2,
      "circle-stroke-color": TEXTE_SUR_BLEU,
    },
  },
  {
    id: COUCHES_DEMANDEURS.communesNombre,
    type: "symbol",
    source: SOURCE_DEMANDEURS,
    filter: ["!", ["has", "point_count"]],
    layout: { "text-field": ["to-string", ["get", "demandeurs"]], "text-font": POLICE, "text-size": 12 },
    paint: { "text-color": TEXTE_SUR_BLEU },
  },
];

/** Couches du simulateur sans objet ici : on ne garde que le fond et les zones d'aléa. */
export const COUCHES_MASQUEES = [LAYER_IDS.rnbPoints, LAYER_IDS.rnbFormes];
