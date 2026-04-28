import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";
import { getSharedEnv } from "@/shared/config/env.config";

/**
 * Mode d'AMO appliqué selon le département du demandeur (arrêté 2026).
 * - OBLIGATOIRE : 1 AMO auto-affecté à la création du parcours.
 * - AV_AMO_FUSIONNES : l'aller-vers local joue le rôle d'AMO (auto-attribution).
 *   Mode optionnel : aucun département en mode AV_AMO_FUSIONNES par défaut.
 * - FACULTATIF : le demandeur peut choisir un AMO ou continuer sans.
 */
export enum AmoMode {
  OBLIGATOIRE = "obligatoire",
  AV_AMO_FUSIONNES = "av_amo_fusionnes",
  FACULTATIF = "facultatif",
}

/**
 * Valeurs par défaut (utilisées si les variables d'environnement ne sont pas définies).
 * Configuration côté Scalingo via :
 *   - NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE   (CSV, ex. "03,36,47,54,81")
 *   - NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES  (CSV, ex. "" pour vide, ou "63" pour activer)
 *
 * Les codes sont normalisés (sans zéro initial) — alignés sur les clés du référentiel
 * `DEPARTEMENTS` de `@/shared/constants/departements.constants`.
 */
const DEFAULT_DEPARTEMENTS_AMO_OBLIGATOIRE = ["3", "36", "47", "54", "81"] as const;
const DEFAULT_DEPARTEMENTS_AV_AMO_FUSIONNES: readonly string[] = [];

/**
 * Construit l'ensemble des codes département à partir d'une variable d'environnement CSV.
 *   - undefined → utilise les valeurs par défaut
 *   - "" ou CSV → parse (chaîne vide = override explicite vers liste vide)
 */
function buildDeptSet(envVar: string | undefined, defaults: readonly string[]): Set<string> {
  const source =
    envVar === undefined
      ? Array.from(defaults)
      : envVar
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  return new Set(source.map(normalizeCodeDepartement));
}

const env = getSharedEnv();

const DEPARTEMENTS_AMO_OBLIGATOIRE = buildDeptSet(
  env.NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE,
  DEFAULT_DEPARTEMENTS_AMO_OBLIGATOIRE
);

const DEPARTEMENTS_AV_AMO_FUSIONNES = buildDeptSet(
  env.NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES,
  DEFAULT_DEPARTEMENTS_AV_AMO_FUSIONNES
);

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
