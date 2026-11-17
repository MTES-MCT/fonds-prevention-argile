import { compterJoursPlage } from "./plage-matomo";

export type IssueAppelMatomo = "ok" | "timeout" | "erreur_http" | "erreur_matomo" | "erreur_reseau";

export interface AppelMatomo {
  methode: string;
  period: string;
  date: string;
  segment?: string;
  /** Appels Matomo en cours au départ de celui-ci, lui compris. */
  simultanes: number;
  dureeMs: number;
  issue: IssueAppelMatomo;
}

/** Noms des critères d'un segment, sans leurs valeurs (`dimension1==36;referrerName==x` → `dimension1+referrerName`). */
export function decrireSegment(segment?: string): string {
  if (!segment) return "aucun";
  const noms = segment
    .split(/[;,]/)
    .map((critere) => /^[A-Za-z0-9_]+/.exec(critere.trim())?.[0])
    .filter((nom): nom is string => Boolean(nom));
  return noms.length > 0 ? [...new Set(noms)].join("+") : "illisible";
}

export function classerEchecReseau(error: unknown): IssueAppelMatomo {
  // Lu sur l'objet et non via `instanceof Error` : une DOMException n'en hérite pas partout.
  const nom = typeof error === "object" && error !== null && "name" in error ? String(error.name) : "";
  return nom === "TimeoutError" || nom === "AbortError" ? "timeout" : "erreur_reseau";
}

/** Une ligne par appel réellement envoyé à Matomo : un appel servi par le cache n'en écrit pas. */
export function formaterJournalAppel(appel: AppelMatomo): string {
  const jours = compterJoursPlage(appel.date) ?? appel.date;
  return [
    "[matomo] appel",
    `methode=${appel.methode}`,
    `period=${appel.period}`,
    `jours=${jours}`,
    `segment=${decrireSegment(appel.segment)}`,
    `simultanes=${appel.simultanes}`,
    `duree=${Math.round(appel.dureeMs)}ms`,
    `issue=${appel.issue}`,
  ].join(" ");
}
