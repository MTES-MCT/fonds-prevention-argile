/**
 * Étapes du simulateur d'éligibilité
 */
export const SimulateurStep = {
  INTRO: "intro",
  TYPE_LOGEMENT: "type_logement",
  ADRESSE: "adresse",
  CARACTERISTIQUES: "caracteristiques",
  ETAT_MAISON: "etat_maison",
  MITOYENNETE: "mitoyennete",
  INDEMNISATION: "indemnisation",
  CATASTROPHES_NATURELLES: "catastrophes_naturelles",
  ASSURANCE: "assurance",
  PROPRIETAIRE: "proprietaire",
  REVENUS: "revenus",
  RESULTAT: "resultat",
} as const;

export type SimulateurStep = (typeof SimulateurStep)[keyof typeof SimulateurStep];

/**
 * Écrans de saisie, dans l'ordre de passage (sans l'intro et le résultat)
 */
export const ETAPES_SAISIE: SimulateurStep[] = [
  SimulateurStep.TYPE_LOGEMENT,
  SimulateurStep.ADRESSE,
  SimulateurStep.CARACTERISTIQUES,
  SimulateurStep.ETAT_MAISON,
  SimulateurStep.MITOYENNETE,
  SimulateurStep.INDEMNISATION,
  SimulateurStep.CATASTROPHES_NATURELLES,
  SimulateurStep.ASSURANCE,
  SimulateurStep.PROPRIETAIRE,
  SimulateurStep.REVENUS,
];

/** Écrans qui prolongent une étape sans en être une : ils en reprennent le numéro affiché. */
const ECRANS_RATTACHES: Partial<Record<SimulateurStep, SimulateurStep>> = {
  [SimulateurStep.CARACTERISTIQUES]: SimulateurStep.ADRESSE,
};

/**
 * Étapes numérotées (affichées à l'utilisateur)
 */
export const ETAPES_NUMEROTEES: SimulateurStep[] = ETAPES_SAISIE.filter((etape) => !ECRANS_RATTACHES[etape]);

/**
 * Retourne le numéro d'étape affiché (1-9)
 */
export function getNumeroEtape(step: SimulateurStep): number | null {
  const index = ETAPES_NUMEROTEES.indexOf(ECRANS_RATTACHES[step] ?? step);
  return index >= 0 ? index + 1 : null;
}

/**
 * Nombre total d'étapes numérotées
 */
export const TOTAL_ETAPES = ETAPES_NUMEROTEES.length;
