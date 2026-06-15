/**
 * Logique partagée de catégorisation du bug "double-progression AMO".
 * Utilisée par `audit-parcours-ds-integrity.ts` (affichage) et
 * `fix-double-progression-amo.ts` (correction), pour que les deux scripts
 * disent EXACTEMENT la même chose.
 *
 * Contexte : docs/parcours/INCIDENT-double-progression-amo.md
 */

import { Step } from "@/shared/domain/value-objects/step.enum";

export type DoubleProgressionCategory = "legitime" | "regressable" | "cleanup_requis" | "a_reviewer";

/** Forme minimale d'un dossier DS suffisante pour catégoriser. */
export interface DossierForCategory {
  step: string;
  /** `null` = dossier créé dans DS mais jamais soumis (brouillon jetable). */
  dsStatus: string | null;
}

/**
 * Catégorise un parcours actuellement en `diagnostic`/`devis`/`factures`,
 * selon ses dossiers DS, du point de vue du bug double-progression AMO.
 *
 * - `legitime`       : possède un dossier `eligibilite` → a franchi l'éligibilité
 *                      normalement. Cas typique de l'utilisateur passif qui n'a pas
 *                      (encore) créé le dossier de son étape courante. **Rien à corriger.**
 * - `regressable`    : aucun dossier DS → propulsé sans rien créer (bug). Régression simple.
 * - `cleanup_requis` : dossiers downstream UNIQUEMENT sans statut DS (brouillons DS
 *                      jamais soumis, ex. cas "Edouard"). Régression après suppression des brouillons.
 * - `a_reviewer`     : au moins un dossier downstream SOUMIS sans dossier d'éligibilité.
 *                      Vraie donnée en jeu → intervention humaine.
 *
 * Pré-condition : à n'appeler que sur des parcours dont `current_step` est en aval
 * de l'éligibilité (diagnostic/devis/factures).
 */
export function categorizeDoubleProgression(dossiers: DossierForCategory[]): DoubleProgressionCategory {
  if (dossiers.some((d) => d.step === Step.ELIGIBILITE)) return "legitime";
  if (dossiers.length === 0) return "regressable";
  if (dossiers.every((d) => !d.dsStatus)) return "cleanup_requis";
  return "a_reviewer";
}

/** Libellés courts pour l'affichage. */
export const CATEGORY_LABELS: Record<DoubleProgressionCategory, string> = {
  legitime: "LÉGITIME (utilisateur passif — a franchi l'éligibilité, rien à corriger)",
  regressable: "À CORRIGER — régressable (aucun dossier DS)",
  cleanup_requis: "À CORRIGER — cleanup requis (brouillon downstream en_construction)",
  a_reviewer: "À REVIEWER (dossier downstream soumis côté DS)",
};

/** True si la catégorie relève du bug (par opposition aux cas légitimes). */
export function isBugCategory(category: DoubleProgressionCategory): boolean {
  return category !== "legitime";
}
