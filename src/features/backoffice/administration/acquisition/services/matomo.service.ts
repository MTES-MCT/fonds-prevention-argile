import {
  fetchMatomoVisits,
  fetchMatomoBounceCounts,
  fetchMatomoUniqueVisitorsStrict,
} from "../adapters/matomo-api.adapter";
import type {
  MatomoStatistiques,
  MatomoVisitsResponse,
  VisiteParJour,
  GranulariteVisites,
} from "../domain/types/matomo.types";
import { decouperPeriodeMatomo, formaterDateMatomo } from "../domain/decoupage-periode";
import { logMatomoFailure } from "../domain/panne-matomo";
import {
  getFenetrePeriode,
  getFenetrePeriodePrecedente,
  type FenetrePeriode,
} from "@/features/backoffice/administration/tableau-de-bord/domain/periode-window";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

function formaterPlage(fenetre: FenetrePeriode): string {
  return `${formaterDateMatomo(fenetre.debut)},${formaterDateMatomo(fenetre.dernierJour)}`;
}

function computeVariation(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Granularité à utiliser pour toute requête Matomo additive (comptages : visites, events…)
 * selon la durée de période, en remplacement de `period=range`. Un `range` n'est jamais
 * pré-archivé par Matomo — recalculé en live à chaque appel, pire cas quand un segment
 * (département) est appliqué. `day`/`week`/`month` sur une plage lisent des archives
 * pré-calculées, sommables sans perte pour un comptage (contrairement aux visiteurs uniques,
 * qui nécessitent une vraie déduplication et restent donc en `range`).
 * On élargit la granularité sur les longues périodes pour limiter le nombre de sous-archives
 * demandées en un seul appel (même cause que le timeout déjà connu sur les Funnels).
 */
export function getGranulariteForPeriode(periodeId?: PeriodeId): GranulariteVisites {
  if (periodeId === "90j" || periodeId === "6m") return "week";
  if (periodeId === "12m" || periodeId === "tout") return "month";
  return "day";
}

/**
 * Extrait une date exploitable par `new Date(...)` d'une clé Matomo.
 * En `period=day`, la clé est une date simple ("2026-01-05"). En `period=week`/`month`
 * sur un `date=range`, Matomo renvoie la sous-période sous forme "début,fin"
 * ("2026-01-05,2026-01-11") — sans cette extraction, `new Date("2026-01-05,2026-01-11")`
 * vaut "Invalid Date" et casse le tri/l'affichage du graphique.
 */
function extractDateDebut(matomoDateKey: string): string {
  return matomoDateKey.split(",")[0];
}

// Number(...) : Matomo sérialise parfois la valeur en string (cf. gotcha CLAUDE.md).
function lireVisites(valeur: unknown): number {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : 0;
}

function totalVisites(visites: MatomoVisitsResponse): number {
  return Object.values(visites).reduce((total: number, valeur) => total + lireVisites(valeur), 0);
}

/** Taux recomposé : visites et rebonds s'additionnent entre sous-périodes, pas le taux. */
async function getTauxRebond(
  fenetre: FenetrePeriode,
  granularite: GranulariteVisites,
  segment?: string
): Promise<number> {
  const sousPeriodes = decouperPeriodeMatomo(fenetre.debut, fenetre.dernierJour, granularite);
  const compteurs = await Promise.all(
    sousPeriodes.map(({ period, date }) => fetchMatomoBounceCounts(period, date, segment))
  );
  const visites = compteurs.reduce((total, compteur) => total + compteur.visites, 0);
  const rebonds = compteurs.reduce((total, compteur) => total + compteur.rebonds, 0);

  // Arrondi à l'entier, comme le `bounce_rate` que Matomo renvoyait en `range`.
  return visites > 0 ? Math.round((rebonds / visites) * 100) : 0;
}

/**
 * Récupère les statistiques Matomo pour une période donnée, avec variations.
 * Chaque lecture échoue seule : une valeur à `null` est indisponible, les autres restent affichées.
 */
export async function getMatomoStatistiques(periodeId?: PeriodeId, segment?: string): Promise<MatomoStatistiques> {
  const granularite = getGranulariteForPeriode(periodeId);
  const fenetre = getFenetrePeriode(periodeId);
  const fenetrePrecedente = getFenetrePeriodePrecedente(periodeId);
  const plage = formaterPlage(fenetre);
  const plagePrecedente = fenetrePrecedente ? formaterPlage(fenetrePrecedente) : null;

  const [visites, tauxRebond, visiteursUniques, visitesPrecedentes, tauxRebondPrecedent, visiteursPrecedents] =
    await Promise.all([
      logMatomoFailure(fetchMatomoVisits(granularite, plage, segment), "visites du site"),
      logMatomoFailure(getTauxRebond(fenetre, granularite, segment), "taux de rebond"),
      logMatomoFailure(fetchMatomoUniqueVisitorsStrict("range", plage, segment), "visiteurs uniques du site"),
      plagePrecedente
        ? logMatomoFailure(fetchMatomoVisits(granularite, plagePrecedente, segment), "visites du site (precedent)")
        : null,
      fenetrePrecedente
        ? logMatomoFailure(getTauxRebond(fenetrePrecedente, granularite, segment), "taux de rebond (precedent)")
        : null,
      plagePrecedente
        ? logMatomoFailure(
            fetchMatomoUniqueVisitorsStrict("range", plagePrecedente, segment),
            "visiteurs uniques du site (precedent)"
          )
        : null,
    ]);

  // Structure : { "date": nombre } (day) ou { "début,fin": nombre } (week/month).
  // Limite connue : en week/month les buckets de bord débordent de la fenêtre, donc le total
  // la dépasse un peu. Assumé pour une courbe de tendance.
  const visitesParJour: VisiteParJour[] = Object.entries(visites ?? {}).map(([date, valeur]) => ({
    date: extractDateDebut(date),
    visites: lireVisites(valeur),
  }));
  const nombreVisitesTotales = visitesParJour.reduce((total, jour) => total + jour.visites, 0);

  return {
    nombreVisitesTotales,
    variationVisites:
      visites && visitesPrecedentes ? computeVariation(nombreVisitesTotales, totalVisites(visitesPrecedentes)) : null,
    visiteursUniques: visiteursUniques?.valeur ?? null,
    visiteursUniquesCalculesLe: visiteursUniques?.calculeLe ?? null,
    variationVisiteursUniques:
      visiteursUniques && visiteursPrecedents?.valeur
        ? computeVariation(visiteursUniques.valeur, visiteursPrecedents.valeur)
        : null,
    visitesParJour,
    granulariteVisites: granularite,
    tauxRebond,
    variationTauxRebond:
      tauxRebond !== null && tauxRebondPrecedent !== null ? Math.round(tauxRebond - tauxRebondPrecedent) : null,
  };
}
