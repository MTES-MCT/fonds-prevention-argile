import { calculerTrancheRevenu, type TrancheRevenuRga } from "@/features/simulateur/domain/types/rga-revenus.types";

// Départements d'Île-de-France : DN expose le département de la commune, pas sa région.
export const DEPARTEMENTS_IDF: ReadonlySet<string> = new Set(["75", "77", "78", "91", "92", "93", "94", "95"]);

/** Libellés contractuels : ce sont les options de la liste déroulante « Tranche de revenus » dans DN. */
export const TYPES_MENAGE = {
  TMO: "TMO",
  MO: "MO",
  INT: "INT",
  HORS_PLAFOND: "Hors plafond",
  NON_CALCULABLE: "Non calculable",
} as const;

export type TypeMenage = (typeof TYPES_MENAGE)[keyof typeof TYPES_MENAGE];

type TypeMenageEligible = typeof TYPES_MENAGE.TMO | typeof TYPES_MENAGE.MO | typeof TYPES_MENAGE.INT;

// Taux des phases étude et travaux, repris du tableau « Taux de subvention de l'État » de la page d'accueil.
export const TAUX_SUBVENTION: Record<TypeMenageEligible, number> = {
  [TYPES_MENAGE.TMO]: 90,
  [TYPES_MENAGE.MO]: 85,
  [TYPES_MENAGE.INT]: 70,
};

const TYPE_PAR_TRANCHE: Record<TrancheRevenuRga, TypeMenage> = {
  "très modeste": TYPES_MENAGE.TMO,
  modeste: TYPES_MENAGE.MO,
  intermédiaire: TYPES_MENAGE.INT,
  supérieure: TYPES_MENAGE.HORS_PLAFOND,
};

export interface TrancheDossier {
  typeMenage: TypeMenage;
  /** Pourcentage, null hors plafond ou si le calcul est impossible. */
  tauxSubvention: number | null;
}

export function estDepartementIDF(codeDepartement: string): boolean {
  return DEPARTEMENTS_IDF.has(codeDepartement);
}

export function calculerTrancheDossier(params: {
  revenuFiscalReference: number | null;
  nombrePersonnes: number | null;
  codeDepartement: string | null;
}): TrancheDossier {
  const { revenuFiscalReference, nombrePersonnes, codeDepartement } = params;
  if (revenuFiscalReference === null || !nombrePersonnes || nombrePersonnes < 1 || !codeDepartement) {
    return { typeMenage: TYPES_MENAGE.NON_CALCULABLE, tauxSubvention: null };
  }
  const typeMenage =
    TYPE_PAR_TRANCHE[calculerTrancheRevenu(revenuFiscalReference, nombrePersonnes, estDepartementIDF(codeDepartement))];
  const tauxSubvention = typeMenage in TAUX_SUBVENTION ? TAUX_SUBVENTION[typeMenage as TypeMenageEligible] : null;
  return { typeMenage, tauxSubvention };
}

/** Valeur de l'annotation « Taux de subvention » (nombre entier) : 0 hors plafond, null si incalculable. */
export function valeurTauxSubvention(tranche: TrancheDossier): number | null {
  if (tranche.tauxSubvention !== null) return tranche.tauxSubvention;
  return tranche.typeMenage === TYPES_MENAGE.HORS_PLAFOND ? 0 : null;
}
