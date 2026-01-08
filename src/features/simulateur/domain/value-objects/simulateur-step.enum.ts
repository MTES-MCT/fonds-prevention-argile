/**
 * Étapes du simulateur d'éligibilité
 */
export const SimulateurStep = {
  INTRO: "intro",
  TYPE_LOGEMENT: "type_logement",
  ADRESSE: "adresse",
  ETAT_MAISON: "etat_maison",
  MITOYENNETE: "mitoyennete",
  INDEMNISATION: "indemnisation",
  ASSURANCE: "assurance",
  PROPRIETAIRE: "proprietaire",
  REVENUS: "revenus",
  RESULTAT: "resultat",
} as const;

export type SimulateurStep = (typeof SimulateurStep)[keyof typeof SimulateurStep];

/**
 * Étapes numérotées (affichées à l'utilisateur) sans l'intro et le résultat
 */
export const ETAPES_NUMEROTEES: SimulateurStep[] = [
  SimulateurStep.TYPE_LOGEMENT,
  SimulateurStep.ADRESSE,
  SimulateurStep.ETAT_MAISON,
  SimulateurStep.MITOYENNETE,
  SimulateurStep.INDEMNISATION,
  SimulateurStep.ASSURANCE,
  SimulateurStep.PROPRIETAIRE,
  SimulateurStep.REVENUS,
];

/**
 * Retourne le numéro d'étape affiché (1-8)
 */
export function getNumeroEtape(step: SimulateurStep): number | null {
  const index = ETAPES_NUMEROTEES.indexOf(step);
  return index >= 0 ? index + 1 : null;
}

/**
 * Nombre total d'étapes numérotées
 */
export const TOTAL_ETAPES = ETAPES_NUMEROTEES.length;
