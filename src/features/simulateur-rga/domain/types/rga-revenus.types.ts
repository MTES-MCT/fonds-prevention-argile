/**
 * Types pour les tranches de revenus RGA
 */

export type TrancheRevenuRga = "très modeste" | "modeste" | "intermédiaire" | "supérieure";

export interface SeuilsRevenuRga {
  tresModeste: number;
  modeste: number;
  intermediaire: number;
}

/**
 * Seuils de revenus pour l'Île-de-France
 */
export const SEUILS_IDF: Record<number, SeuilsRevenuRga> = {
  1: { tresModeste: 23541, modeste: 28657, intermediaire: 40018 },
  2: { tresModeste: 34551, modeste: 42058, intermediaire: 58827 },
  3: { tresModeste: 41493, modeste: 50513, intermediaire: 70382 },
  4: { tresModeste: 48447, modeste: 58981, intermediaire: 82839 },
  5: { tresModeste: 55427, modeste: 67473, intermediaire: 94844 },
};

/**
 * Seuils de revenus hors Île-de-France
 */
export const SEUILS_HORS_IDF: Record<number, SeuilsRevenuRga> = {
  1: { tresModeste: 17173, modeste: 22015, intermediaire: 29148 },
  2: { tresModeste: 25115, modeste: 32197, intermediaire: 42848 },
  3: { tresModeste: 30206, modeste: 38719, intermediaire: 51592 },
  4: { tresModeste: 35285, modeste: 45234, intermediaire: 60336 },
  5: { tresModeste: 40388, modeste: 51775, intermediaire: 69081 },
};

/**
 * Calcule la tranche de revenu pour un ménage
 */
export function calculerTrancheRevenu(
  revenuFiscal: number,
  nombrePersonnes: number,
  estIDF: boolean
): TrancheRevenuRga {
  const seuils = estIDF ? SEUILS_IDF : SEUILS_HORS_IDF;

  // Pour 6 personnes et plus, on applique un coefficient par personne supplémentaire
  let seuilsAppliques: SeuilsRevenuRga;

  if (nombrePersonnes <= 5) {
    seuilsAppliques = seuils[nombrePersonnes];
  } else {
    const base = seuils[5];
    const personnesSupp = nombrePersonnes - 5;

    if (estIDF) {
      seuilsAppliques = {
        tresModeste: base.tresModeste + personnesSupp * 6970,
        modeste: base.modeste + personnesSupp * 8486,
        intermediaire: base.intermediaire + personnesSupp * 12006,
      };
    } else {
      seuilsAppliques = {
        tresModeste: base.tresModeste + personnesSupp * 5094,
        modeste: base.modeste + personnesSupp * 6525,
        intermediaire: base.intermediaire + personnesSupp * 8744,
      };
    }
  }

  // Déterminer la tranche (on ajoute +1 aux seuils comme dans le publicode)
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
