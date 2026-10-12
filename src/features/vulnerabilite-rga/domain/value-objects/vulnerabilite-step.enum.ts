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
  RECUPERATEUR_EAU: "recuperateur_eau",
  ARBRE_PROXIMITE: "arbre_proximite",
  HAIES: "haies",
  VEGETATION_PIED_FACADE: "vegetation_pied_facade",
  MITOYENNETE: "mitoyennete",
  ENSOLEILLEMENT: "ensoleillement",
  SOURCE_CHALEUR_SOUS_SOL: "source_chaleur_sous_sol",
  RESULTAT: "resultat",
} as const;

export type VulnerabiliteStep = (typeof VulnerabiliteStep)[keyof typeof VulnerabiliteStep];

/** Étapes numérotées (hors intro/résultat). */
const ETAPES_NUMEROTEES: VulnerabiliteStep[] = [
  VulnerabiliteStep.ADRESSE,
  VulnerabiliteStep.PENTE_TERRAIN,
  VulnerabiliteStep.RESEAUX_ENTERRES,
  VulnerabiliteStep.GRAVIER_PROPRETE,
  VulnerabiliteStep.GOUTTIERES,
  VulnerabiliteStep.RECUPERATEUR_EAU,
  VulnerabiliteStep.ARBRE_PROXIMITE,
  VulnerabiliteStep.HAIES,
  VulnerabiliteStep.VEGETATION_PIED_FACADE,
  VulnerabiliteStep.MITOYENNETE,
  VulnerabiliteStep.ENSOLEILLEMENT,
  VulnerabiliteStep.SOURCE_CHALEUR_SOUS_SOL,
];

/** Numéro d'étape affiché (1-based), ou null pour intro/résultat. */
export function getNumeroEtape(step: VulnerabiliteStep): number | null {
  const index = ETAPES_NUMEROTEES.indexOf(step);
  return index >= 0 ? index + 1 : null;
}

export const TOTAL_ETAPES = ETAPES_NUMEROTEES.length;
