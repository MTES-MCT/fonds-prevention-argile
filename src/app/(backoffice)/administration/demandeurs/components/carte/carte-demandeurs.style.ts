import type * as maplibregl from "maplibre-gl";
import { LAYER_IDS } from "@/features/rga-map/domain/config";

export const SOURCE_DEPARTEMENT = "departement-filtre";

// Une source par département : MapLibre ne regroupe jamais deux sources entre elles.
export const PREFIXE_SOURCE_DEMANDEURS = "demandeurs-";

export function sourceDemandeurs(codeDepartement: string): string {
  return `${PREFIXE_SOURCE_DEMANDEURS}${codeDepartement}`;
}

export function couchesDemandeurs(source: string) {
  return {
    groupes: `${source}-groupes`,
    groupesNombre: `${source}-groupes-nombre`,
    communes: `${source}-communes`,
    communesNombre: `${source}-communes-nombre`,
  };
}

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

// Liseré blanc sous le trait : il le détache des zones d'aléa, qui ont des teintes voisines.
export const COUCHES_DEPARTEMENT: maplibregl.LayerSpecification[] = [
  {
    id: "departement-filtre-lisere",
    type: "line",
    source: SOURCE_DEPARTEMENT,
    layout: { "line-join": "round" },
    paint: { "line-color": TEXTE_SUR_BLEU, "line-width": 7, "line-opacity": 0.9 },
  },
  {
    id: "departement-filtre-trait",
    type: "line",
    source: SOURCE_DEPARTEMENT,
    layout: { "line-join": "round" },
    paint: { "line-color": BLEU_FRANCE, "line-width": 3 },
  },
];

// Deux départements voisins peuvent se chevaucher : sans ces options, MapLibre masquerait l'un des deux nombres.
const NOMBRE_TOUJOURS_AFFICHE = { "text-allow-overlap": true, "text-ignore-placement": true } as const;

export function couchesSource(source: string): maplibregl.LayerSpecification[] {
  const ids = couchesDemandeurs(source);
  return [
    {
      id: ids.groupes,
      type: "circle",
      source,
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
      id: ids.groupesNombre,
      type: "symbol",
      source,
      filter: ["has", "point_count"],
      layout: {
        "text-field": ["to-string", ["get", "demandeurs"]],
        "text-font": POLICE,
        "text-size": 13,
        ...NOMBRE_TOUJOURS_AFFICHE,
      },
      paint: { "text-color": TEXTE_SUR_BLEU },
    },
    {
      id: ids.communes,
      type: "circle",
      source,
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
      id: ids.communesNombre,
      type: "symbol",
      source,
      filter: ["!", ["has", "point_count"]],
      layout: {
        "text-field": ["to-string", ["get", "demandeurs"]],
        "text-font": POLICE,
        "text-size": 12,
        ...NOMBRE_TOUJOURS_AFFICHE,
      },
      paint: { "text-color": TEXTE_SUR_BLEU },
    },
  ];
}

/** Couches du simulateur sans objet ici : on ne garde que le fond et les zones d'aléa. */
export const COUCHES_MASQUEES = [LAYER_IDS.rnbPoints, LAYER_IDS.rnbFormes];
