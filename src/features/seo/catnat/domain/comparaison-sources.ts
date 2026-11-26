import { RETARD_SOURCE_ALERTE_JOURS } from "./config/catnat.config";
import { aUnJourPres, joursEntre, rapprocher, type ArreteGeorisques, type DecisionPubliee } from "./rapprochement";

export type SourceCatnat = "georisques" | "data.gouv";

/** Où en sont les deux sources l'une par rapport à l'autre, sur la période que les deux couvrent. */
export interface ComparaisonSources {
  identiques: number;
  ecartUnJour: number;
  georisquesSeul: number;
  datagouvSeul: number;
  dernierJoGeorisques: string | null;
  dernierJoDatagouv: string | null;
  /** Source dont la dernière reconnaissance publiée date de plus de 15 jours avant celle de l'autre. */
  sourceEnRetard: SourceCatnat | null;
  retardJours: number;
}

const max = (dates: string[]) => dates.reduce<string | null>((a, b) => (a === null || b > a ? b : a), null);

const jourPrecedent = (date: string) => new Date(Date.parse(date) - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

/** Première parution couverte par le jeu data.gouv, à un jour près : avant, Géorisques est seul et ne se compare pas. */
export function debutComparaison(decisions: DecisionPubliee[]): string | null {
  const premiere = decisions.reduce<string | null>(
    (a, b) => (a === null || b.datePublicationJo < a ? b.datePublicationJo : a),
    null
  );
  return premiere && jourPrecedent(premiere);
}

/**
 * Compare les reconnaissances des deux sources depuis le début du jeu data.gouv
 */
export function comparerSources(arretes: ArreteGeorisques[], decisions: DecisionPubliee[]): ComparaisonSources {
  const depuis = debutComparaison(decisions);
  const comparables = depuis ? arretes.filter((arrete) => arrete.datePublicationJo >= depuis) : [];
  const reconnues = decisions.filter((decision) => decision.decision === "reconnue");

  const { communes, georisquesSeul, decisionsSeules } = rapprocher(comparables, reconnues);

  const identiques = communes.filter(
    ({ arrete, decision }) =>
      arrete.dateDebutEvt === decision.dateDebutEvt &&
      arrete.dateFinEvt === decision.dateFinEvt &&
      arrete.datePublicationJo === decision.datePublicationJo
  ).length;

  const dernierJoGeorisques = max(comparables.map((arrete) => arrete.datePublicationJo));
  const dernierJoDatagouv = max(reconnues.map((decision) => decision.datePublicationJo));

  // Une parution décalée d'un jour à la source n'est pas un retard.
  const retardJours =
    dernierJoGeorisques && dernierJoDatagouv && !aUnJourPres(dernierJoGeorisques, dernierJoDatagouv)
      ? joursEntre(dernierJoGeorisques, dernierJoDatagouv)
      : 0;

  const enRetard: SourceCatnat = (dernierJoGeorisques ?? "") < (dernierJoDatagouv ?? "") ? "georisques" : "data.gouv";

  return {
    identiques,
    ecartUnJour: communes.length - identiques,
    georisquesSeul: georisquesSeul.length,
    datagouvSeul: decisionsSeules.length,
    dernierJoGeorisques,
    dernierJoDatagouv,
    sourceEnRetard: retardJours > RETARD_SOURCE_ALERTE_JOURS ? enRetard : null,
    retardJours,
  };
}

/**
 * Compte les épisodes reconnus d'un territoire : les arrêtés de Géorisques, plus ceux que seul le jeu data.gouv connaît
 */
export function compterEpisodesReconnus(
  arretes: Pick<ArreteGeorisques, "codeNationalCatnat" | "datePublicationArrete">[],
  datesArretesReconnus: string[]
): number {
  const connus = new Set(arretes.map((arrete) => arrete.codeNationalCatnat));
  const datesGeorisques = [...new Set(arretes.map((arrete) => arrete.datePublicationArrete))];

  // Le jeu data.gouv n'a pas de code NOR : un arrêté s'y reconnaît à sa date, à un jour près.
  const absentsDeGeorisques = [...new Set(datesArretesReconnus)].filter(
    (date) => !datesGeorisques.some((connue) => aUnJourPres(connue, date))
  );

  return connus.size + absentsDeGeorisques.length;
}
