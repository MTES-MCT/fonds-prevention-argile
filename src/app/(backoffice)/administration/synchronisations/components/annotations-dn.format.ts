import type {
  AnnotationDn,
  BilanAnnotationsDn,
  VerdictControleDn,
} from "@/shared/domain/value-objects/bilan-annotations-dn";

export const LIBELLES_ANNOTATIONS_DN: Record<AnnotationDn, string> = {
  avisImpot: "Avis d'imposition",
  typeMenage: "Tranche de revenus",
  tauxSubvention: "Taux",
  lienCarte: "Lien carte",
  zoneAlea: "Zone d'aléa",
  lienFpa: "Lien FPA",
};

export const LIBELLES_VERDICTS_DN: Record<VerdictControleDn, string> = {
  coherent: "Cohérent",
  a_verifier: "À vérifier",
  non_verifiable: "Non vérifiable",
};

export function dossiersMisAJour(bilan: BilanAnnotationsDn): number {
  return bilan.controles - bilan.aJour - bilan.echecs;
}

function pluriel(nombre: number, mot: string): string {
  return `${nombre} ${mot}${nombre > 1 ? "s" : ""}`;
}

/** Résumé d'une ligne pour la liste des runs ; « — » pour un run antérieur au bilan. */
export function resumerBilanAnnotationsDn(bilan: BilanAnnotationsDn | null): string {
  if (!bilan) return "—";
  const parties =
    bilan.controles === 0
      ? ["Aucun contrôle"]
      : [pluriel(bilan.controles, "contrôlé"), `${dossiersMisAJour(bilan)} mis à jour`];
  if (bilan.echecs > 0) parties.push(pluriel(bilan.echecs, "échec"));
  const liens = bilan.ecritures.lienFpa;
  if (liens > 0) parties.push(liens > 1 ? `${liens} liens FPA complétés` : "1 lien FPA complété");
  if (bilan.echecsLienFpa > 0) parties.push(`${pluriel(bilan.echecsLienFpa, "échec")} de lien FPA`);
  return parties.join(" · ");
}
