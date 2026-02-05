export const TRANCHES_REVENU = ["très modeste", "modeste", "intermédiaire", "supérieure"] as const;

/**
 * Codes région Île-de-France
 */
export const REGIONS_IDF = ["11"] as const;

export type TrancheRevenuRga = (typeof TRANCHES_REVENU)[number];

export interface SeuilsRevenuRga {
  tresModeste: number;
  modeste: number;
  intermediaire: number;
}

export const isTrancheRevenuRga = (value: unknown): value is TrancheRevenuRga => {
  return typeof value === "string" && TRANCHES_REVENU.includes(value as TrancheRevenuRga);
};

/**
 * Seuils de revenus pour l'Île-de-France
 * Source: https://france-renov.gouv.fr/bareme#fr_idf-threshold
 */
export const SEUILS_IDF: Record<number, SeuilsRevenuRga> = {
  1: { tresModeste: 23541, modeste: 28657, intermediaire: 40018 },
  2: { tresModeste: 34551, modeste: 42058, intermediaire: 58827 },
  3: { tresModeste: 41493, modeste: 50513, intermediaire: 70382 },
  4: { tresModeste: 48447, modeste: 58981, intermediaire: 82839 },
  5: { tresModeste: 55427, modeste: 67473, intermediaire: 94844 },
};

/**
 * Coefficients par personne supplémentaire (au-delà de 5) pour l'IdF
 */
export const COEFFICIENTS_IDF = {
  tresModeste: 6970,
  modeste: 8486,
  intermediaire: 12006,
} as const;

/**
 * Seuils de revenus hors Île-de-France
 * Source: https://france-renov.gouv.fr/bareme
 */
export const SEUILS_HORS_IDF: Record<number, SeuilsRevenuRga> = {
  1: { tresModeste: 17173, modeste: 22015, intermediaire: 29148 },
  2: { tresModeste: 25115, modeste: 32197, intermediaire: 42848 },
  3: { tresModeste: 30206, modeste: 38719, intermediaire: 51592 },
  4: { tresModeste: 35285, modeste: 45234, intermediaire: 60336 },
  5: { tresModeste: 40388, modeste: 51775, intermediaire: 69081 },
};

/**
 * Coefficients par personne supplémentaire (au-delà de 5) hors IdF
 */
export const COEFFICIENTS_HORS_IDF = {
  tresModeste: 5094,
  modeste: 6525,
  intermediaire: 8744,
} as const;

/**
 * Vérifie si le code région correspond à l'Île-de-France
 */
export function isRegionIDF(codeRegion: string): boolean {
  return REGIONS_IDF.includes(codeRegion as (typeof REGIONS_IDF)[number]);
}

/**
 * Calcule la tranche de revenu pour un ménage
 */
export function calculerTrancheRevenu(
  revenuFiscal: number,
  nombrePersonnes: number,
  estIDF: boolean
): TrancheRevenuRga {
  const seuils = estIDF ? SEUILS_IDF : SEUILS_HORS_IDF;
  const coefficients = estIDF ? COEFFICIENTS_IDF : COEFFICIENTS_HORS_IDF;

  let seuilsAppliques: SeuilsRevenuRga;

  if (nombrePersonnes <= 5) {
    seuilsAppliques = seuils[nombrePersonnes];
  } else {
    const base = seuils[5];
    const personnesSupp = nombrePersonnes - 5;

    seuilsAppliques = {
      tresModeste: base.tresModeste + personnesSupp * coefficients.tresModeste,
      modeste: base.modeste + personnesSupp * coefficients.modeste,
      intermediaire: base.intermediaire + personnesSupp * coefficients.intermediaire,
    };
  }

  // Déterminer la tranche (on ajoute +1 aux seuils comme dans le barème officiel)
  if (revenuFiscal < seuilsAppliques.tresModeste + 1) {
    return "très modeste";
  }
  if (revenuFiscal < seuilsAppliques.modeste + 1) {
    return "modeste";
  }
  if (revenuFiscal < seuilsAppliques.intermediaire + 1) {
    return "intermédiaire";
  }
  return "supérieure";
}

/**
 * Retourne les seuils de revenus pour un nombre de personnes donné
 */
/**
 * Calculer le niveau de revenu à partir des données RGA
 * Utilise les vrais barèmes France Rénov avec distinction IDF/hors IDF
 * Retourne la tranche capitalisée pour l'affichage (ex: "Très modeste")
 */
export function calculateNiveauRevenuFromRga(
  rgaData: { menage?: { revenu_rga?: number; personnes?: number }; logement?: { code_region?: string } } | null | undefined
): string | null {
  const revenu = rgaData?.menage?.revenu_rga;
  const personnes = rgaData?.menage?.personnes;
  const codeRegion = rgaData?.logement?.code_region;

  // Vérification explicite pour éviter le bug avec revenu = 0 (qui est une valeur valide pour "très modeste")
  if (revenu === null || revenu === undefined || !personnes || !codeRegion) return null;

  const estIDF = isRegionIDF(codeRegion);
  const tranche = calculerTrancheRevenu(revenu, personnes, estIDF);

  // Capitaliser pour l'affichage
  return tranche.charAt(0).toUpperCase() + tranche.slice(1);
}

/**
 * Retourne les seuils de revenus pour un nombre de personnes donné
 */
export function getSeuilsRevenu(nombrePersonnes: number, estIDF: boolean): SeuilsRevenuRga {
  const seuils = estIDF ? SEUILS_IDF : SEUILS_HORS_IDF;
  const coefficients = estIDF ? COEFFICIENTS_IDF : COEFFICIENTS_HORS_IDF;

  if (nombrePersonnes <= 5) {
    return seuils[nombrePersonnes];
  }

  const base = seuils[5];
  const personnesSupp = nombrePersonnes - 5;

  return {
    tresModeste: base.tresModeste + personnesSupp * coefficients.tresModeste,
    modeste: base.modeste + personnesSupp * coefficients.modeste,
    intermediaire: base.intermediaire + personnesSupp * coefficients.intermediaire,
  };
}
