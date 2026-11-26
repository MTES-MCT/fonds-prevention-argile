import type { CatastropheNaturelle } from "@/shared/database/schema/catastrophes-naturelles";
import type { CatnatDecision } from "@/shared/database/schema/catnat-decisions";

/** Ce qu'il faut d'une reconnaissance de Géorisques pour la retrouver dans l'autre source. */
export type ArreteGeorisques = Pick<
  CatastropheNaturelle,
  "codeInsee" | "codeNationalCatnat" | "dateDebutEvt" | "dateFinEvt" | "datePublicationArrete" | "datePublicationJo"
>;

/** Ce qu'il faut d'une décision du jeu data.gouv pour la comparer et l'afficher. */
export type DecisionPubliee = Pick<
  CatnatDecision,
  "codeInsee" | "dateArrete" | "dateDebutEvt" | "dateFinEvt" | "datePublicationJo" | "decision" | "motif"
>;

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

export const joursEntre = (a: string, b: string) => Math.round(Math.abs(Date.parse(a) - Date.parse(b)) / UN_JOUR_MS);

export const aUnJourPres = (a: string, b: string) => joursEntre(a, b) <= 1;

/** Des deux dates d'une même reconnaissance, la plus tardive : Géorisques en date certaines un jour trop tôt. */
export const plusTardive = (a: string, b: string) => (a > b ? a : b);

// Même commune, même arrêté et même période, à un jour près : c'est la même reconnaissance vue par deux sources.
const estLaMemeReconnaissance = (arrete: ArreteGeorisques, decision: DecisionPubliee) =>
  arrete.codeInsee === decision.codeInsee &&
  aUnJourPres(arrete.datePublicationArrete, decision.dateArrete) &&
  aUnJourPres(arrete.dateDebutEvt, decision.dateDebutEvt);

export interface Rapprochement<A extends ArreteGeorisques, D extends DecisionPubliee> {
  communes: { arrete: A; decision: D }[];
  georisquesSeul: A[];
  decisionsSeules: D[];
}

/**
 * Met en regard les reconnaissances des deux sources : celles que les deux publient, et celles d'une seule.
 */
export function rapprocher<A extends ArreteGeorisques, D extends DecisionPubliee>(
  arretes: A[],
  decisions: D[]
): Rapprochement<A, D> {
  const parCommune = new Map<string, D[]>();
  for (const decision of decisions) {
    if (decision.decision !== "reconnue") continue;
    parCommune.set(decision.codeInsee, [...(parCommune.get(decision.codeInsee) ?? []), decision]);
  }

  const dejaRapprochees = new Set<D>();
  const communes: { arrete: A; decision: D }[] = [];
  const georisquesSeul: A[] = [];

  for (const arrete of arretes) {
    const decision = parCommune
      .get(arrete.codeInsee)
      ?.find((candidate) => !dejaRapprochees.has(candidate) && estLaMemeReconnaissance(arrete, candidate));

    if (!decision) {
      georisquesSeul.push(arrete);
      continue;
    }
    dejaRapprochees.add(decision);
    communes.push({ arrete, decision });
  }

  return {
    communes,
    georisquesSeul,
    decisionsSeules: [...parCommune.values()].flat().filter((decision) => !dejaRapprochees.has(decision)),
  };
}
