import { useEffect, useState } from "react";

type ChartType =
  | "LineChart"
  | "BarChart"
  | "BarLineChart"
  | "PieChart"
  | "MapChart"
  | "ScatterChart"
  | "RadarChart"
  | "GaugeChart";

export function useDsfrChart(chartType: ChartType): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadChart() {
      try {
        switch (chartType) {
          case "LineChart":
            await import("@gouvfr/dsfr-chart/LineChart");
            await import("@gouvfr/dsfr-chart/LineChart.css");
            break;
          // TODO: Ajouter les autres types de graphiques ici lorsque nécessaire
        }
        setLoaded(true);
      } catch (error) {
        console.error(`Erreur lors du chargement de ${chartType}:`, error);
      }
    }

    loadChart();
  }, [chartType]);

  return loaded;
}
