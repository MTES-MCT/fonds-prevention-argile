/** Annotations privées écrites par le CRON, désignées par leur nom, jamais par leur valeur. */
export const ANNOTATIONS_DN = ["avisImpot", "typeMenage", "tauxSubvention", "lienFpa"] as const;
export type AnnotationDn = (typeof ANNOTATIONS_DN)[number];

export const ISSUES_ANNOTATIONS_DN = ["ecrite", "inchangee", "echec"] as const;
export type IssueAnnotationsDn = (typeof ISSUES_ANNOTATIONS_DN)[number];

export const VERDICTS_CONTROLE_DN = ["coherent", "a_verifier", "non_verifiable"] as const;
export type VerdictControleDn = (typeof VERDICTS_CONTROLE_DN)[number];

/** Ce que le CRON a fait sur un parcours : l'issue du contrôle et les annotations écrites, aucune valeur. */
export interface AnnotationsDnEntree {
  /** Issue du contrôle de l'avis, null quand seul le lien FPA a été complété. */
  issue: IssueAnnotationsDn | null;
  /** Un `lienFpa` par dossier complété. */
  annotationsEcrites: AnnotationDn[];
  echecLienFpa?: boolean;
}

/** Totaux d'un run, agrégés et non nominatifs : le verdict n'est compté qu'ici. */
export interface BilanAnnotationsDn {
  controles: number;
  ecritures: Record<AnnotationDn, number>;
  aJour: number;
  echecs: number;
  echecsLienFpa: number;
  verdicts: Record<VerdictControleDn, number>;
}

export function bilanAnnotationsDnVide(): BilanAnnotationsDn {
  return {
    controles: 0,
    ecritures: { avisImpot: 0, typeMenage: 0, tauxSubvention: 0, lienFpa: 0 },
    aJour: 0,
    echecs: 0,
    echecsLienFpa: 0,
    verdicts: { coherent: 0, a_verifier: 0, non_verifiable: 0 },
  };
}

export function ajouterAuBilanAnnotationsDn(
  bilan: BilanAnnotationsDn,
  entree: AnnotationsDnEntree,
  verdict: VerdictControleDn | null
): BilanAnnotationsDn {
  const ecritures = { ...bilan.ecritures };
  for (const annotation of entree.annotationsEcrites) ecritures[annotation] += 1;
  const verdicts = { ...bilan.verdicts };
  if (verdict) verdicts[verdict] += 1;
  return {
    controles: bilan.controles + (entree.issue ? 1 : 0),
    ecritures,
    aJour: bilan.aJour + (entree.issue === "inchangee" ? 1 : 0),
    echecs: bilan.echecs + (entree.issue === "echec" ? 1 : 0),
    echecsLienFpa: bilan.echecsLienFpa + (entree.echecLienFpa ? 1 : 0),
    verdicts,
  };
}
