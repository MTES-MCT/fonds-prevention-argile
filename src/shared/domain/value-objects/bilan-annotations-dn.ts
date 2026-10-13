/** Annotations privées écrites par le CRON, désignées par leur nom, jamais par leur valeur. */
export const ANNOTATIONS_DN = [
  "avisImpot",
  "typeMenage",
  "tauxSubvention",
  "lienCarte",
  "zoneAlea",
  "lienFpa",
] as const;
export type AnnotationDn = (typeof ANNOTATIONS_DN)[number];

/** Valeurs Chorus lues dans DN et reportées chez nous, désignées par leur nom, jamais par leur valeur. */
export const CHORUS_REPORTES = ["tiersFournisseur", "numeroEj", "montantSubvention"] as const;
export type ChorusReporte = (typeof CHORUS_REPORTES)[number];

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
  /** Adresse de la maison sans point BAN sûr : lien en recherche texte, zone d'aléa non écrite. */
  adresseNonGeocodee?: boolean;
  chorusReporte?: ChorusReporte[];
  echecChorus?: boolean;
}

export interface BilanChorus {
  dossiers: number;
  valeurs: Record<ChorusReporte, number>;
  echecs: number;
}

/** Totaux d'un run, agrégés et non nominatifs : le verdict n'est compté qu'ici. */
export interface BilanAnnotationsDn {
  controles: number;
  ecritures: Record<AnnotationDn, number>;
  aJour: number;
  echecs: number;
  echecsLienFpa: number;
  adressesNonGeocodees: number;
  verdicts: Record<VerdictControleDn, number>;
  /** Absent des runs antérieurs au suivi Chorus. */
  chorus?: BilanChorus;
}

function bilanChorusVide(): BilanChorus {
  return { dossiers: 0, valeurs: { tiersFournisseur: 0, numeroEj: 0, montantSubvention: 0 }, echecs: 0 };
}

export function bilanAnnotationsDnVide(): BilanAnnotationsDn {
  return {
    controles: 0,
    ecritures: { avisImpot: 0, typeMenage: 0, tauxSubvention: 0, lienCarte: 0, zoneAlea: 0, lienFpa: 0 },
    aJour: 0,
    echecs: 0,
    echecsLienFpa: 0,
    adressesNonGeocodees: 0,
    verdicts: { coherent: 0, a_verifier: 0, non_verifiable: 0 },
    chorus: bilanChorusVide(),
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
  const chorusAvant = bilan.chorus ?? bilanChorusVide();
  const reportes = entree.chorusReporte ?? [];
  const valeurs = { ...chorusAvant.valeurs };
  for (const nom of reportes) valeurs[nom] += 1;
  return {
    controles: bilan.controles + (entree.issue ? 1 : 0),
    ecritures,
    aJour: bilan.aJour + (entree.issue === "inchangee" ? 1 : 0),
    echecs: bilan.echecs + (entree.issue === "echec" ? 1 : 0),
    echecsLienFpa: bilan.echecsLienFpa + (entree.echecLienFpa ? 1 : 0),
    adressesNonGeocodees: bilan.adressesNonGeocodees + (entree.adresseNonGeocodee ? 1 : 0),
    verdicts,
    chorus: {
      dossiers: chorusAvant.dossiers + (reportes.length > 0 ? 1 : 0),
      valeurs,
      echecs: chorusAvant.echecs + (entree.echecChorus ? 1 : 0),
    },
  };
}
