import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";
import { getSharedEnv } from "@/shared/config/env.config";
import { getDemandeurFirstLogement, type ParcoursSimulationPair } from "@/shared/domain/utils/rga-simulation.utils";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../../utils/amo.utils";

/**
 * Règles d'AMO applicables à un département (arrêté 2026). Les deux axes sont
 * **indépendants** : le Gers cumule AV et AMO sans rendre l'AMO obligatoire, et un
 * département peut imposer l'AMO sans que l'aller-vers en soit un.
 */
export interface ReglesAmo {
  /** L'AMO est imposé : ni autonomie, ni choix d'accompagnement — il est attribué d'office. */
  amoObligatoire: boolean;
  /** L'aller-vers du territoire est aussi l'AMO : sa validation peut valoir celle de l'AMO. */
  avCumuleAmo: boolean;
}

/**
 * Valeurs par défaut (utilisées si les variables d'environnement ne sont pas définies).
 * Configuration côté Scalingo via :
 *   - NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE   (CSV, ex. "03,04,36,47,54,63,81")
 *   - NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES  (CSV, ex. "" pour vide, ou "32" pour activer)
 *
 * Les deux listes se recoupent volontairement : 03/04/54/63 imposent l'AMO **et** ont un
 * aller-vers qui l'est aussi ; le 32 cumule sans imposer.
 *
 * Les codes sont normalisés (sans zéro initial) — alignés sur les clés du référentiel
 * `DEPARTEMENTS` de `@/shared/constants/departements.constants`.
 */
const DEFAULT_DEPARTEMENTS_AMO_OBLIGATOIRE = ["3", "4", "36", "47", "54", "63", "81"] as const;
const DEFAULT_DEPARTEMENTS_AV_AMO_FUSIONNES: readonly string[] = ["3", "4", "32", "54", "63"];

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
 * Règles applicables à un département. Accepte le code en format officiel ("03", "54")
 * ou normalisé ("3", "54"). Département non listé : AMO facultatif, sans cumul.
 */
export function getReglesAmo(codeDepartement: string | number): ReglesAmo {
  const normalized = normalizeCodeDepartement(codeDepartement);
  return {
    amoObligatoire: DEPARTEMENTS_AMO_OBLIGATOIRE.has(normalized),
    avCumuleAmo: DEPARTEMENTS_AV_AMO_FUSIONNES.has(normalized),
  };
}

/**
 * L'AMO est-il imposé dans ce département ? Seul critère de l'attribution d'office :
 * un département qui cumule AV et AMO sans l'imposer laisse le demandeur choisir.
 */
export function estAmoObligatoire(codeDepartement: string | number): boolean {
  return getReglesAmo(codeDepartement).amoObligatoire;
}

/**
 * L'aller-vers du territoire y est-il aussi l'AMO ? N'implique jamais l'obligation.
 */
export function avCumuleAmo(codeDepartement: string | number): boolean {
  return getReglesAmo(codeDepartement).avCumuleAmo;
}

/**
 * Règles d'un parcours, résolues USER-first avec repli agent (cf. RBAC-ROLES §6).
 * `null` = commune introuvable : l'appelant refuse, il ne suppose jamais l'AMO facultatif.
 */
export function resolveReglesAmoForParcours(parcours: ParcoursSimulationPair): ReglesAmo | null {
  const codeInsee = normalizeCodeInsee(getDemandeurFirstLogement(parcours)?.commune);
  if (!codeInsee) return null;
  return getReglesAmo(getCodeDepartementFromCodeInsee(codeInsee));
}

/**
 * L'autonomie (détachement de l'AMO) n'existe que là où l'AMO n'est pas imposé — porte
 * d'entrée unique des trois chemins qui y mènent, pour qu'ils ne puissent pas diverger.
 */
export function peutPasserEnAutonomie(parcours: ParcoursSimulationPair): boolean {
  return resolveReglesAmoForParcours(parcours)?.amoObligatoire === false;
}
