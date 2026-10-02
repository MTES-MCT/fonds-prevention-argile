import type {
  AnnotationDn,
  BilanAnnotationsDn,
  VerdictControleDn,
} from "@/shared/domain/value-objects/bilan-annotations-dn";

export const LIBELLES_ANNOTATIONS_DN: Record<AnnotationDn, string> = {
  avisImpot: "Avis d'imposition",
  typeMenage: "Type de ménage",
  tauxSubvention: "Taux",
};

export const LIBELLES_VERDICTS_DN: Record<VerdictControleDn, string> = {
  coherent: "Cohérent",
  a_verifier: "À vérifier",
  non_verifiable: "Non vérifiable",
};

export function dossiersMisAJour(bilan: BilanAnnotationsDn): number {
  return bilan.controles - bilan.aJour - bilan.echecs;
}

/** Résumé d'une ligne pour la liste des runs ; « — » pour un run antérieur au bilan. */
export function resumerBilanAnnotationsDn(bilan: BilanAnnotationsDn | null): string {
  if (!bilan) return "—";
  if (bilan.controles === 0) return "Aucun contrôle";
  const parties = [
    `${bilan.controles} contrôlé${bilan.controles > 1 ? "s" : ""}`,
    `${dossiersMisAJour(bilan)} mis à jour`,
  ];
  if (bilan.echecs > 0) parties.push(`${bilan.echecs} échec${bilan.echecs > 1 ? "s" : ""}`);
  return parties.join(" · ");
}
