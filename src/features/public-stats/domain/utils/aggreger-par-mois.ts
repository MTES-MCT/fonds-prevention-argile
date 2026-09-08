import type { PointEvolutionMensuelle } from "../types/public-stats.types";

const LABEL_FORMAT: Intl.DateTimeFormatOptions = { month: "short", year: "numeric", timeZone: "UTC" };

function cleMois(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Un point par mois calendaire entre `depuis` et `jusqua` (inclus), initialisés à 0. */
function initMoisVides(depuis: Date, jusqua: Date): Map<string, number> {
  const compte = new Map<string, number>();
  const cursor = new Date(Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth(), 1));
  const fin = new Date(Date.UTC(jusqua.getUTCFullYear(), jusqua.getUTCMonth(), 1));
  while (cursor <= fin) {
    compte.set(cleMois(cursor), 0);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return compte;
}

function versPoints(compte: Map<string, number>): PointEvolutionMensuelle[] {
  return Array.from(compte.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cle, count]) => {
      const [annee, mois] = cle.split("-").map(Number);
      const label = new Date(Date.UTC(annee, mois - 1, 1)).toLocaleDateString("fr-FR", LABEL_FORMAT);
      return { label, count };
    });
}

/**
 * Agrège un tableau de dates (BDD) en série mensuelle, un point par mois calendaire entre
 * `depuis` et `jusqua` (inclus), mois vides compris (count: 0) — pour que les mini-graphiques de
 * la page publique partagent le même axe des mois, même si une métrique démarre plus tard que les
 * autres. Calculé en UTC pour cohérence avec les dates stockées en base (cf. `evolution-temporelle.ts`,
 * qui suit la même convention pour les granularités jour/semaine).
 */
export function aggregerParMois(dates: Date[], depuis: Date, jusqua: Date): PointEvolutionMensuelle[] {
  const compte = initMoisVides(depuis, jusqua);

  for (const date of dates) {
    const cle = cleMois(date);
    if (compte.has(cle)) {
      compte.set(cle, (compte.get(cle) ?? 0) + 1);
    }
  }

  return versPoints(compte);
}

/**
 * Même agrégation mensuelle, mais à partir de compteurs déjà calculés par sous-période (ex :
 * réponse Matomo `{ "2025-10-01,2025-10-31": 42, ... }`) plutôt que de dates brutes à compter une
 * à une — `dateDebutSousPeriode` extrait la date de début de chaque clé de sous-période.
 */
export function aggregerCompteursParMois(
  compteursParSousPeriode: Record<string, number>,
  depuis: Date,
  jusqua: Date,
  dateDebutSousPeriode: (cle: string) => Date | null
): PointEvolutionMensuelle[] {
  const compte = initMoisVides(depuis, jusqua);

  for (const [cleSousPeriode, valeur] of Object.entries(compteursParSousPeriode)) {
    const debut = dateDebutSousPeriode(cleSousPeriode);
    if (!debut) continue;
    const cle = cleMois(debut);
    if (compte.has(cle)) {
      compte.set(cle, (compte.get(cle) ?? 0) + valeur);
    }
  }

  return versPoints(compte);
}
