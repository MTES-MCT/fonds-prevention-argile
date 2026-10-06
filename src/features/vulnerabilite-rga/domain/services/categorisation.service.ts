import {
  CRITERES_CONFIG,
  getCritereConfig,
  type CategorieAffichee,
  type CategorieReponse,
  type CritereConfig,
} from "../value-objects/grille-categorisation";
import { toReponsesParCritere, type ReponsesParCritere } from "../value-objects/vulnerabilite-critere-fields";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

export interface PointVulnerabilite {
  critereId: string;
  reponse: string;
  categorie: CategorieAffichee;
}

export interface VulnerabiliteResultat {
  /** Un point par réponse catégorisée, dans l'ordre des questions. */
  points: PointVulnerabilite[];
}

export type ComptePoints = Record<CategorieAffichee, number>;

function isCritereApplicable(critere: CritereConfig, reponses: ReponsesParCritere): boolean {
  if (!critere.conditionnelA) return true;
  return reponses[critere.conditionnelA.critereId] === critere.conditionnelA.reponseRequise;
}

/** Catégorie d'une réponse, ou null si la question n'en porte pas (essence, aléa) ou si la réponse est inconnue. */
export function getCategorieReponse(critereId: string, reponse: string): CategorieReponse | null {
  return getCritereConfig(critereId)?.reponses.find((r) => r.reponse === reponse)?.categorie ?? null;
}

/**
 * Traduit les réponses aplaties en points catégorisés. Les réponses `sans_objet`, sans
 * catégorie ou non applicables ne produisent rien. Fonction pure, rejouable côté serveur.
 */
export function categoriserReponses(reponses: ReponsesParCritere): PointVulnerabilite[] {
  return CRITERES_CONFIG.flatMap((critere) => {
    const reponse = reponses[critere.id];
    if (reponse === undefined || !isCritereApplicable(critere, reponses)) return [];

    const categorie = getCategorieReponse(critere.id, reponse);
    if (categorie === null || categorie === "sans_objet") return [];

    return [{ critereId: critere.id, reponse, categorie }];
  });
}

/** Même traduction, à partir des réponses collectées section par section (parcours en cours). */
export function computeResultat(answers: PartialVulnerabiliteReponses): VulnerabiliteResultat {
  return { points: categoriserReponses(toReponsesParCritere(answers)) };
}

export function compterPoints(points: PointVulnerabilite[]): ComptePoints {
  const compte: ComptePoints = { critique: 0, vigilance: 0, a_verifier: 0, bonne_pratique: 0 };
  for (const point of points) compte[point.categorie] += 1;
  return compte;
}
