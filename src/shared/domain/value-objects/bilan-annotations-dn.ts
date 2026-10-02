/** Annotations privées écrites par le CRON, désignées par leur nom, jamais par leur valeur. */
export const ANNOTATIONS_DN = ["avisImpot", "typeMenage", "tauxSubvention"] as const;
export type AnnotationDn = (typeof ANNOTATIONS_DN)[number];

export const ISSUES_ANNOTATIONS_DN = ["ecrite", "inchangee", "echec"] as const;
export type IssueAnnotationsDn = (typeof ISSUES_ANNOTATIONS_DN)[number];

export const VERDICTS_CONTROLE_DN = ["coherent", "a_verifier", "non_verifiable"] as const;
export type VerdictControleDn = (typeof VERDICTS_CONTROLE_DN)[number];

/** Ce qu'un contrôle a fait sur un dossier : l'issue et les annotations écrites, aucune valeur. */
export interface AnnotationsDnEntree {
  issue: IssueAnnotationsDn;
  annotationsEcrites: AnnotationDn[];
}

/** Totaux d'un run, agrégés et non nominatifs : le verdict n'est compté qu'ici. */
export interface BilanAnnotationsDn {
  controles: number;
  ecritures: Record<AnnotationDn, number>;
  aJour: number;
  echecs: number;
  verdicts: Record<VerdictControleDn, number>;
}

export function bilanAnnotationsDnVide(): BilanAnnotationsDn {
  return {
    controles: 0,
    ecritures: { avisImpot: 0, typeMenage: 0, tauxSubvention: 0 },
    aJour: 0,
    echecs: 0,
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
    controles: bilan.controles + 1,
    ecritures,
    aJour: bilan.aJour + (entree.issue === "inchangee" ? 1 : 0),
    echecs: bilan.echecs + (entree.issue === "echec" ? 1 : 0),
    verdicts,
  };
}
