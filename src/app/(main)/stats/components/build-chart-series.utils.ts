import type { PointEvolutionMensuelle } from "@/features/public-stats/domain/types/public-stats.types";

export const LABEL_MOIS_EN_COURS = "Mois en cours (partiel)";

export interface ChartSeries {
  x: string;
  y: string;
  name: string;
  selectedPalette: string;
}

/** `aggregerParMois` va toujours jusqu'à "maintenant" : le dernier point est donc systématiquement
 * le mois civil en cours, incomplet. dsfr-chart n'expose aucun style de segment (pas de `borderDash`,
 * cf. son bundle) : on isole ce dernier segment dans une 2e série (couleur plus claire de la même
 * palette) pour qu'il se distingue visuellement de l'historique complet. */
export function buildChartSeries(points: PointEvolutionMensuelle[], title: string): ChartSeries {
  const x = JSON.stringify([points.map((p) => p.label)]);

  if (points.length < 2) {
    return {
      x,
      y: JSON.stringify([points.map((p) => p.count)]),
      name: JSON.stringify([title]),
      selectedPalette: "default",
    };
  }

  const dernierIndex = points.length - 1;
  const historique = points.map((p, i) => (i < dernierIndex ? p.count : null));
  const moisEnCours = points.map((p, i) => (i >= dernierIndex - 1 ? p.count : null));

  return {
    x,
    y: JSON.stringify([historique, moisEnCours]),
    name: JSON.stringify([title, LABEL_MOIS_EN_COURS]),
    selectedPalette: "categorical",
  };
}
