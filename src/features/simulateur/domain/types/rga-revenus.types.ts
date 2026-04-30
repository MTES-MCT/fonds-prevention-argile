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
 * Seuils de revenus pour l'Île-de-France (barèmes ANAH 2026)
 * Source: https://www.service-public.gouv.fr/particuliers/vosdroits/F1328
 */
export const SEUILS_IDF: Record<number, SeuilsRevenuRga> = {
  1: { tresModeste: 24031, modeste: 29253, intermediaire: 40851 },
  2: { tresModeste: 35270, modeste: 42933, intermediaire: 60051 },
  3: { tresModeste: 42357, modeste: 51564, intermediaire: 71846 },
  4: { tresModeste: 49455, modeste: 60208, intermediaire: 84562 },
  5: { tresModeste: 56580, modeste: 68877, intermediaire: 96817 },
};

/**
 * Coefficients par personne supplémentaire (au-delà de 5) pour l'IdF
 */
export const COEFFICIENTS_IDF = {
  tresModeste: 7116,
  modeste: 8663,
  intermediaire: 12257,
} as const;

/**
 * Seuils de revenus hors Île-de-France (barèmes ANAH 2026)
 * Source: https://www.service-public.gouv.fr/particuliers/vosdroits/F1328
 */
export const SEUILS_HORS_IDF: Record<number, SeuilsRevenuRga> = {
  1: { tresModeste: 17363, modeste: 22259, intermediaire: 31185 },
  2: { tresModeste: 25393, modeste: 32553, intermediaire: 45842 },
  3: { tresModeste: 30540, modeste: 39148, intermediaire: 55196 },
  4: { tresModeste: 35676, modeste: 45735, intermediaire: 64550 },
  5: { tresModeste: 40835, modeste: 52348, intermediaire: 73907 },
};

/**
 * Coefficients par personne supplémentaire (au-delà de 5) hors IdF
 */
export const COEFFICIENTS_HORS_IDF = {
  tresModeste: 5151,
  modeste: 6598,
  intermediaire: 9357,
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
  rgaData:
    | { menage?: { revenu_rga?: number; personnes?: number }; logement?: { code_region?: string } }
    | null
    | undefined
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
