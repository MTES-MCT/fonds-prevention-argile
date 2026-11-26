import type { DecisionCatnat } from "@/shared/database/schema/catnat-decisions";
import { plusTardive, rapprocher, type ArreteGeorisques, type DecisionPubliee } from "./rapprochement";

/** Une ligne du tableau « historique des catastrophes naturelles » d'une commune. */
export interface LigneHistoriqueCatnat {
  decision: DecisionCatnat;
  /** Absent d'une reconnaissance que Géorisques n'a pas (encore) publiée, et de tout refus. */
  codeNor: string | null;
  dateDebut: string;
  dateFin: string;
  datePublicationJo: string;
  motif: string | null;
}

const ligneDeGeorisques = (arrete: ArreteGeorisques): LigneHistoriqueCatnat => ({
  decision: "reconnue",
  codeNor: arrete.codeNationalCatnat,
  dateDebut: arrete.dateDebutEvt,
  dateFin: arrete.dateFinEvt,
  datePublicationJo: arrete.datePublicationJo,
  motif: null,
});

const ligneDeDecision = (decision: DecisionPubliee): LigneHistoriqueCatnat => ({
  decision: decision.decision,
  codeNor: null,
  dateDebut: decision.dateDebutEvt,
  dateFin: decision.dateFinEvt,
  datePublicationJo: decision.datePublicationJo,
  motif: decision.motif,
});

/**
 * Réunit les deux sources : une reconnaissance s'affiche dès que l'une la publie, un refus dès qu'il est connu.
 * Publiée par les deux, elle n'apparaît qu'une fois : code NOR de Géorisques, et la plus tardive de chaque date.
 */
export function fusionnerHistorique(
  arretes: ArreteGeorisques[],
  decisions: DecisionPubliee[]
): LigneHistoriqueCatnat[] {
  const { communes, georisquesSeul, decisionsSeules } = rapprocher(arretes, decisions);

  const lignes: LigneHistoriqueCatnat[] = [
    ...communes.map(({ arrete, decision }) => ({
      ...ligneDeGeorisques(arrete),
      dateDebut: plusTardive(arrete.dateDebutEvt, decision.dateDebutEvt),
      dateFin: plusTardive(arrete.dateFinEvt, decision.dateFinEvt),
      datePublicationJo: plusTardive(arrete.datePublicationJo, decision.datePublicationJo),
    })),
    ...georisquesSeul.map(ligneDeGeorisques),
    ...decisionsSeules.map(ligneDeDecision),
    ...decisions.filter((decision) => decision.decision === "non_reconnue").map(ligneDeDecision),
  ];

  return lignes.sort(
    (a, b) => b.dateDebut.localeCompare(a.dateDebut) || b.datePublicationJo.localeCompare(a.datePublicationJo)
  );
}
