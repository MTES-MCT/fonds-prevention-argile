import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

/**
 * Étapes du simulateur de vulnérabilité RGA.
 */
export const VulnerabiliteStep = {
  INTRO: "intro",
  ADRESSE: "adresse",
  PENTE_TERRAIN: "pente_terrain",
  RESEAUX_ENTERRES: "reseaux_enterres",
  GRAVIER_PROPRETE: "gravier_proprete",
  GOUTTIERES: "gouttieres",
  ARBRE_PROXIMITE: "arbre_proximite",
  ARBRE_ESSENCE: "arbre_essence",
  HAIES: "haies",
  VEGETATION_PIED_FACADE: "vegetation_pied_facade",
  MITOYENNETE: "mitoyennete",
  ENSOLEILLEMENT: "ensoleillement",
  RESULTAT: "resultat",
} as const;

export type VulnerabiliteStep = (typeof VulnerabiliteStep)[keyof typeof VulnerabiliteStep];

/**
 * Étapes numérotées de base (hors intro/résultat). `ARBRE_ESSENCE` n'est comptée
 * que si elle s'applique (cf. `getEtapesNumerotees`) — c'est la même logique qui
 * pilote le skip dans `step-flow.rules.ts`, dupliquée ici volontairement pour
 * garder ce fichier indépendant de la logique de navigation.
 */
const ETAPES_NUMEROTEES_BASE: VulnerabiliteStep[] = [
  VulnerabiliteStep.ADRESSE,
  VulnerabiliteStep.PENTE_TERRAIN,
  VulnerabiliteStep.RESEAUX_ENTERRES,
  VulnerabiliteStep.GRAVIER_PROPRETE,
  VulnerabiliteStep.GOUTTIERES,
  VulnerabiliteStep.ARBRE_PROXIMITE,
  VulnerabiliteStep.ARBRE_ESSENCE,
  VulnerabiliteStep.HAIES,
  VulnerabiliteStep.VEGETATION_PIED_FACADE,
  VulnerabiliteStep.MITOYENNETE,
  VulnerabiliteStep.ENSOLEILLEMENT,
];

function isArbreEssenceApplicable(answers: PartialVulnerabiliteReponses): boolean {
  return answers.vegetation?.arbre_proximite === "oui";
}

/** Étapes numérotées réellement affichées, compte tenu du branchement arbre → essence. */
export function getEtapesNumerotees(answers: PartialVulnerabiliteReponses): VulnerabiliteStep[] {
  const showEssence = isArbreEssenceApplicable(answers);
  return ETAPES_NUMEROTEES_BASE.filter((step) => step !== VulnerabiliteStep.ARBRE_ESSENCE || showEssence);
}

/** Numéro d'étape affiché (1-based), ou null pour intro/résultat. */
export function getNumeroEtape(step: VulnerabiliteStep, answers: PartialVulnerabiliteReponses): number | null {
  const index = getEtapesNumerotees(answers).indexOf(step);
  return index >= 0 ? index + 1 : null;
}

/** Nombre total d'étapes numérotées affichées (10 ou 11 selon le branchement arbre). */
export function getTotalEtapes(answers: PartialVulnerabiliteReponses): number {
  return getEtapesNumerotees(answers).length;
}
