import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";

/**
 * Mode d'AMO appliqué selon le département du demandeur (arrêté 2026).
 * - OBLIGATOIRE : 1 AMO auto-affecté à la création du parcours.
 * - AV_AMO_FUSIONNES : l'aller-vers local joue le rôle d'AMO (auto-attribution).
 * - FACULTATIF : le demandeur peut choisir un AMO ou continuer sans.
 */
export enum AmoMode {
  OBLIGATOIRE = "obligatoire",
  AV_AMO_FUSIONNES = "av_amo_fusionnes",
  FACULTATIF = "facultatif",
}

/**
 * Codes normalisés (sans zéro initial) — alignés sur les clés du référentiel
 * `DEPARTEMENTS` de `@/shared/constants/departements.constants`.
 */
const DEPARTEMENTS_AMO_OBLIGATOIRE = new Set(["36", "47", "81"]);
const DEPARTEMENTS_AV_AMO_FUSIONNES = new Set(["3", "54", "63"]);

/**
 * Résout le mode d'AMO applicable pour un département donné.
 * Accepte le code en format officiel ("03", "54") ou normalisé ("3", "54").
 *
 * Comportement par défaut (dept non listé, ex. "59" en attente de validation
 * préfecture) : FACULTATIF.
 */
export function getAmoMode(codeDepartement: string | number): AmoMode {
  const normalized = normalizeCodeDepartement(codeDepartement);
  if (DEPARTEMENTS_AV_AMO_FUSIONNES.has(normalized)) return AmoMode.AV_AMO_FUSIONNES;
  if (DEPARTEMENTS_AMO_OBLIGATOIRE.has(normalized)) return AmoMode.OBLIGATOIRE;
  return AmoMode.FACULTATIF;
}

/**
 * Vrai si le département impose une auto-attribution d'AMO (obligatoire ou AV/AMO fusionnés).
 */
export function isAmoAttributionAutomatique(codeDepartement: string | number): boolean {
  const mode = getAmoMode(codeDepartement);
  return mode === AmoMode.OBLIGATOIRE || mode === AmoMode.AV_AMO_FUSIONNES;
}
