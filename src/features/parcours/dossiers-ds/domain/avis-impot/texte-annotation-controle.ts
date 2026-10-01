import { STATUTS_CONTROLE, type ResultatControleAvisImpot, type StatutControle } from "./controle-avis-impot";

/** Libellés validés par le métier : l'annotation DN se résume à l'une de ces phrases. */
export const TEXTES_ANNOTATION_CONTROLE: Record<StatutControle, string> = {
  [STATUTS_CONTROLE.COHERENT]:
    "Les informations renseignées par le demandeur sont cohérentes avec l'avis d'imposition.",
  [STATUTS_CONTROLE.A_VERIFIER]:
    "Attention, il semble y avoir une incohérence entre les informations renseignées par le demandeur et l'avis d'imposition.",
  [STATUTS_CONTROLE.NON_VERIFIABLE]:
    "La vérification automatique n'a pas pu être réalisée : l'avis d'imposition n'a pas pu être lu. Une vérification manuelle est nécessaire.",
};

// Seul le RFR décide : le foyer, estimé depuis les parts, est trop incertain pour alerter la DDT.
export function statutAnnotationControle(resultat: ResultatControleAvisImpot): StatutControle {
  return resultat.revenu.statut;
}

export function texteAnnotationControle(resultat: ResultatControleAvisImpot): string {
  return TEXTES_ANNOTATION_CONTROLE[statutAnnotationControle(resultat)];
}
