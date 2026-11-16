/** Marge en jours : Matomo peut encore réarchiver la veille (visites à cheval sur minuit, rapports en retard). */
const JOURS_AVANT_PLAGE_STABLE = 2;

const MS_PAR_JOUR = 24 * 60 * 60 * 1000;

interface PlageMatomo {
  debut: Date;
  fin: Date;
}

function lireJour(texte: string): Date | null {
  const morceaux = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte.trim());
  if (!morceaux) return null;
  const jour = new Date(Number(morceaux[1]), Number(morceaux[2]) - 1, Number(morceaux[3]));
  return Number.isNaN(jour.getTime()) ? null : jour;
}

/** Bornes d'un paramètre `date` Matomo (`AAAA-MM-JJ[,AAAA-MM-JJ]`) ; null pour un mot-clé (`today`, `last30`). */
export function lirePlageMatomo(date: string): PlageMatomo | null {
  const [premier, second] = date.split(",");
  const debut = lireJour(premier ?? "");
  const fin = second === undefined ? debut : lireJour(second);
  if (!debut || !fin || debut > fin) return null;
  return { debut, fin };
}

/** Nombre de jours couverts, bornes comprises ; null si la plage n'est pas lisible. */
export function compterJoursPlage(date: string): number | null {
  const plage = lirePlageMatomo(date);
  if (!plage) return null;
  return Math.round((plage.fin.getTime() - plage.debut.getTime()) / MS_PAR_JOUR) + 1;
}

/** Vrai si la plage est close depuis assez longtemps pour que sa réponse ne change plus. */
export function estPlageStable(date: string, maintenant: Date = new Date()): boolean {
  const plage = lirePlageMatomo(date);
  if (!plage) return false;
  const limite = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  limite.setDate(limite.getDate() - JOURS_AVANT_PLAGE_STABLE);
  return plage.fin <= limite;
}
