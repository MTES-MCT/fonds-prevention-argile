import type { GranulariteVisites } from "./types/matomo.types";

/** Une requête Matomo : une granularité et une plage alignée sur ses bornes de calendrier. */
export interface SousPeriodeMatomo {
  period: GranulariteVisites;
  date: string;
}

/** Granularité utilisée pour combler les bords d'une granularité donnée. */
const GRANULARITE_INFERIEURE: Record<GranulariteVisites, GranulariteVisites | null> = {
  month: "week",
  week: "day",
  day: null,
};

/**
 * Formate une date pour l'API Matomo dans le fuseau local.
 * `toISOString()` bascule en UTC : entre minuit et 2h à Paris il renvoie la veille, décalant
 * silencieusement toute la fenêtre d'un jour.
 */
export function formaterDateMatomo(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, "0");
  const jour = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mois}-${jour}`;
}

function auJour(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function ajouterJours(date: Date, jours: number): Date {
  const resultat = auJour(date);
  resultat.setDate(resultat.getDate() + jours);
  return resultat;
}

/** Matomo découpe ses semaines du lundi au dimanche. */
function debutDeBucket(date: Date, granularite: GranulariteVisites): Date {
  const jour = auJour(date);
  if (granularite === "month") return new Date(jour.getFullYear(), jour.getMonth(), 1);
  if (granularite === "week") return ajouterJours(jour, -((jour.getDay() + 6) % 7));
  return jour;
}

function finDeBucket(date: Date, granularite: GranulariteVisites): Date {
  const jour = auJour(date);
  if (granularite === "month") return new Date(jour.getFullYear(), jour.getMonth() + 1, 0);
  if (granularite === "week") return ajouterJours(debutDeBucket(jour, "week"), 6);
  return jour;
}

function bucketSuivant(date: Date, granularite: GranulariteVisites): Date {
  return ajouterJours(finDeBucket(date, granularite), 1);
}

/**
 * Découpe une fenêtre en requêtes Matomo dont les plages sont alignées sur les bornes de
 * calendrier de leur granularité, en ne couvrant que les jours réellement demandés.
 *
 * Matomo ne sait pas rogner une semaine ou un mois : sur `period=week&date=2026-03-12,2026-06-10`
 * il renvoie les semaines *pleines* qui recouvrent la plage (`2026-03-09,2026-03-15` en tête) —
 * sommer ces buckets compte 7 jours hors fenêtre et fait chevaucher la période courante et la
 * précédente sur leur semaine frontière. On demande donc les buckets entiers au centre et on
 * comble chaque bord avec la granularité inférieure (mois → semaines → jours), pour un total
 * exact sans retomber sur les 365 archives journalières que `getGranulariteForPeriode` évite.
 */
export function decouperPeriodeMatomo(debut: Date, fin: Date, granulariteMax: GranulariteVisites): SousPeriodeMatomo[] {
  const premierJour = auJour(debut);
  const dernierJour = auJour(fin);
  if (premierJour > dernierJour) return [];

  const plage = (d: Date, f: Date) => `${formaterDateMatomo(d)},${formaterDateMatomo(f)}`;

  const granulariteInferieure = GRANULARITE_INFERIEURE[granulariteMax];
  if (!granulariteInferieure) return [{ period: "day", date: plage(premierJour, dernierJour) }];

  const debutBucketInitial = debutDeBucket(premierJour, granulariteMax);
  const debutInterne =
    debutBucketInitial.getTime() === premierJour.getTime()
      ? premierJour
      : bucketSuivant(debutBucketInitial, granulariteMax);

  const finBucketFinal = finDeBucket(dernierJour, granulariteMax);
  const finInterne =
    finBucketFinal.getTime() === dernierJour.getTime()
      ? dernierJour
      : ajouterJours(debutDeBucket(dernierJour, granulariteMax), -1);

  // Aucun bucket entier ne tient dans la fenêtre : on redescend d'un cran.
  if (debutInterne > finInterne) return decouperPeriodeMatomo(premierJour, dernierJour, granulariteInferieure);

  return [
    ...decouperPeriodeMatomo(premierJour, ajouterJours(debutInterne, -1), granulariteInferieure),
    { period: granulariteMax, date: plage(debutInterne, finInterne) },
    ...decouperPeriodeMatomo(ajouterJours(finInterne, 1), dernierJour, granulariteInferieure),
  ];
}
