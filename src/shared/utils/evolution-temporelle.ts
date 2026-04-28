/** Un point de la courbe d'évolution (jour ou semaine) */
export interface PointEvolution {
  label: string;
  count: number;
}

/** Évolution du nombre d'éléments créés dans le temps */
export interface EvolutionDemandeurs {
  points: PointEvolution[];
  granularite: "jour" | "semaine";
}

/** Retourne le lundi de la semaine contenant la date donnée (heure mise à 00:00) */
function debutDeSemaine(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const jour = d.getDay();
  const diff = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Agrège un tableau de dates en série temporelle (1 point par jour ou par semaine)
 *
 * Granularité automatique :
 * - <= 30 jours d'amplitude : 1 point par jour
 * - > 30 jours : 1 point par semaine (lundi comme début de semaine)
 */
export function aggregerEvolution(dates: Date[]): EvolutionDemandeurs {
  if (dates.length === 0) {
    return { points: [], granularite: "jour" };
  }

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const diffJours = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const granularite: "jour" | "semaine" = diffJours <= 30 ? "jour" : "semaine";

  const compte = new Map<string, number>();

  if (granularite === "jour") {
    const cursor = new Date(minDate);
    cursor.setHours(0, 0, 0, 0);
    const fin = new Date(maxDate);
    fin.setHours(0, 0, 0, 0);
    while (cursor <= fin) {
      compte.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const date of dates) {
      const cle = date.toISOString().slice(0, 10);
      compte.set(cle, (compte.get(cle) ?? 0) + 1);
    }
  } else {
    const cursor = debutDeSemaine(minDate);
    const fin = debutDeSemaine(maxDate);
    while (cursor <= fin) {
      compte.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setDate(cursor.getDate() + 7);
    }
    for (const date of dates) {
      const cle = debutDeSemaine(date).toISOString().slice(0, 10);
      compte.set(cle, (compte.get(cle) ?? 0) + 1);
    }
  }

  const points: PointEvolution[] = Array.from(compte.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cle, count]) => ({
      label: new Date(cle).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      count,
    }));

  return { points, granularite };
}
