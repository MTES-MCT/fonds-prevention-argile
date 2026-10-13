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

export const STATUTS_CHORUS = ["reporte", "inchange", "absent"] as const;
export type StatutChorus = (typeof STATUTS_CHORUS)[number];
export type StatutsChorus = Record<ChorusReporte, StatutChorus>;

/** Pour chaque valeur Chorus : combien de dossiers lus l'ont reportée, laissée inchangée ou trouvée absente de DN. */
export interface BilanChorus {
  lus: number;
  statuts: Record<ChorusReporte, Record<StatutChorus, number>>;
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

function compteursStatutsVides(): Record<StatutChorus, number> {
  return { reporte: 0, inchange: 0, absent: 0 };
}

export function bilanChorusVide(): BilanChorus {
  return {
    lus: 0,
    statuts: {
      tiersFournisseur: compteursStatutsVides(),
      numeroEj: compteursStatutsVides(),
      montantSubvention: compteursStatutsVides(),
    },
    echecs: 0,
  };
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
  return {
    controles: bilan.controles + (entree.issue ? 1 : 0),
    ecritures,
    aJour: bilan.aJour + (entree.issue === "inchangee" ? 1 : 0),
    echecs: bilan.echecs + (entree.issue === "echec" ? 1 : 0),
    echecsLienFpa: bilan.echecsLienFpa + (entree.echecLienFpa ? 1 : 0),
    adressesNonGeocodees: bilan.adressesNonGeocodees + (entree.adresseNonGeocodee ? 1 : 0),
    verdicts,
    chorus: bilan.chorus,
  };
}

/** `statuts` est null quand le dossier d'éligibilité n'a pas été relu (rien à compter) ou que le report a échoué. */
export function ajouterChorusAuBilan(
  bilan: BilanAnnotationsDn,
  statuts: StatutsChorus | null,
  echec: boolean
): BilanAnnotationsDn {
  const avant = bilan.chorus ?? bilanChorusVide();
  if (!statuts && !echec) return bilan;
  const compteurs = {
    tiersFournisseur: { ...avant.statuts.tiersFournisseur },
    numeroEj: { ...avant.statuts.numeroEj },
    montantSubvention: { ...avant.statuts.montantSubvention },
  };
  if (statuts) for (const nom of CHORUS_REPORTES) compteurs[nom][statuts[nom]] += 1;
  return {
    ...bilan,
    chorus: { lus: avant.lus + (statuts ? 1 : 0), statuts: compteurs, echecs: avant.echecs + (echec ? 1 : 0) },
  };
}
