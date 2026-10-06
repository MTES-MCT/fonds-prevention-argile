import { STATUTS_CONTROLE, type ResultatControleAvisImpot, type StatutControle } from "./controle-avis-impot";
import { euros } from "./detail-controle-avis-impot";

/** Libellés validés par le métier ; l'incohérence est complétée par les deux montants comparés. */
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

/** Pour les sorties de scripts : la phrase sans ses montants, qui ne se journalisent pas. */
export function masquerMontants(texte: string): string {
  return texte.replace(/\d[\d\s]* €/g, "*** €");
}

export function texteAnnotationControle(resultat: ResultatControleAvisImpot): string {
  const statut = statutAnnotationControle(resultat);
  const { declare, avis } = resultat.revenu;
  if (statut !== STATUTS_CONTROLE.A_VERIFIER || declare === null || avis === null) {
    return TEXTES_ANNOTATION_CONTROLE[statut];
  }
  const source =
    resultat.avisLus > 1 ? `les avis d'imposition (somme de ${resultat.avisLus} avis)` : "l'avis d'imposition";
  const phrase = TEXTES_ANNOTATION_CONTROLE[statut].replace(/\.$/, "");
  return `${phrase} : montant déclaré = ${euros(declare)} et montant indiqué dans ${source} = ${euros(avis)}.`;
}
