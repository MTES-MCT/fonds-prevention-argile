import type { CatastropheNaturelle } from "@/shared/database/schema/catastrophes-naturelles";
import type { CatnatDecision, DecisionCatnat } from "@/shared/database/schema/catnat-decisions";

/** Une ligne du tableau « historique des catastrophes naturelles » d'une commune. */
export interface LigneHistoriqueCatnat {
  decision: DecisionCatnat;
  /** Absent d'une décision que Géorisques n'a pas (encore) publiée, et de tout refus. */
  codeNor: string | null;
  dateDebut: string;
  dateFin: string;
  datePublicationJo: string;
  motif: string | null;
}

const UN_JOUR_MS = 24 * 60 * 60 * 1000;

const aUnJourPres = (a: string, b: string) => Math.abs(Date.parse(a) - Date.parse(b)) <= UN_JOUR_MS;

// Géorisques date certains arrêtés un jour trop tôt : même arrêté et même période, à un jour près.
const estLaMemeReconnaissance = (arrete: CatastropheNaturelle, decision: CatnatDecision) =>
  aUnJourPres(arrete.datePublicationArrete, decision.dateArrete) &&
  aUnJourPres(arrete.dateDebutEvt, decision.dateDebutEvt);

/**
 * Réunit les reconnaissances de Géorisques et les décisions publiées au Journal officiel, refus compris.
 * Une reconnaissance présente des deux côtés n'apparaît qu'une fois, avec son code NOR et les dates du JO.
 */
export function fusionnerHistorique(
  arretes: CatastropheNaturelle[],
  decisions: CatnatDecision[]
): LigneHistoriqueCatnat[] {
  const reconnues = decisions.filter((decision) => decision.decision === "reconnue");
  const dejaRapprochees = new Set<CatnatDecision>();

  const lignes: LigneHistoriqueCatnat[] = arretes.map((arrete) => {
    const decision = reconnues.find(
      (candidate) => !dejaRapprochees.has(candidate) && estLaMemeReconnaissance(arrete, candidate)
    );
    if (decision) dejaRapprochees.add(decision);

    return {
      decision: "reconnue",
      codeNor: arrete.codeNationalCatnat,
      dateDebut: decision?.dateDebutEvt ?? arrete.dateDebutEvt,
      dateFin: decision?.dateFinEvt ?? arrete.dateFinEvt,
      datePublicationJo: decision?.datePublicationJo ?? arrete.datePublicationJo,
      motif: null,
    };
  });

  for (const decision of decisions) {
    if (dejaRapprochees.has(decision)) continue;

    lignes.push({
      decision: decision.decision,
      codeNor: null,
      dateDebut: decision.dateDebutEvt,
      dateFin: decision.dateFinEvt,
      datePublicationJo: decision.datePublicationJo,
      motif: decision.motif,
    });
  }

  return lignes.sort(
    (a, b) => b.dateDebut.localeCompare(a.dateDebut) || b.datePublicationJo.localeCompare(a.datePublicationJo)
  );
}
