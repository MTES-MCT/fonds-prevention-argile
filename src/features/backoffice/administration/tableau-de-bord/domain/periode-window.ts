import { PERIODES, SERVICE_START_DATE, type PeriodeId } from "./types/tableau-de-bord.types";

/**
 * Fenêtre temporelle d'un filtre de période.
 *
 * `fin` est une borne **exclusive** (instant), utilisée telle quelle par les requêtes BDD
 * (`gte(debut) && lt(fin)`). `dernierJour` est le dernier jour **inclus** : c'est cette borne
 * que l'API Matomo attend, son `date=debut,fin` étant inclusif des deux côtés. Les confondre
 * ajoutait une journée à chaque fenêtre et faisait partager la journée frontière entre la
 * période courante et la précédente.
 */
export interface FenetrePeriode {
  debut: Date;
  fin: Date;
  dernierJour: Date;
}

function minuit(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function minuitDecale(jours: number): Date {
  const date = minuit(new Date());
  date.setDate(date.getDate() + jours);
  return date;
}

function joursDePeriode(periodeId?: PeriodeId): number | null {
  const periode = periodeId ? PERIODES.find((p) => p.id === periodeId) : null;
  return periode?.jours ?? null;
}

/** Les `n` derniers jours calendaires, aujourd'hui compris. */
export function getFenetrePeriode(periodeId?: PeriodeId): FenetrePeriode {
  const jours = joursDePeriode(periodeId);
  const maintenant = new Date();

  if (jours === null) {
    return { debut: SERVICE_START_DATE, fin: maintenant, dernierJour: minuit(maintenant) };
  }

  return { debut: minuitDecale(-(jours - 1)), fin: maintenant, dernierJour: minuit(maintenant) };
}

/** Les `n` jours calendaires précédant immédiatement la fenêtre courante, sans recouvrement. */
export function getFenetrePeriodePrecedente(periodeId?: PeriodeId): FenetrePeriode | null {
  const jours = joursDePeriode(periodeId);
  if (jours === null) return null;

  return {
    debut: minuitDecale(-(jours * 2 - 1)),
    fin: minuitDecale(-(jours - 1)),
    dernierJour: minuitDecale(-jours),
  };
}
