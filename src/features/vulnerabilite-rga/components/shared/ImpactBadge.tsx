import { getNiveauVulnerabilite } from "../../domain/services/scoring.service";
import {
  LABELS_RISQUE,
  COULEURS_RISQUE,
  LABELS_SOLUTION,
  COULEURS_SOLUTION,
} from "../../domain/value-objects/niveau-badge.const";

interface ImpactBadgeProps {
  /** Score 0-100 de la réponse ou du critère concerné (0 = idéal, 100 = risque maximal). */
  score: number;
  /**
   * "risque" (défaut) : le score décrit la réponse choisie par l'utilisateur — rouge = mauvaise
   * nouvelle, cohérent avec la jauge. "solution" : le même score décrit une recommandation —
   * l'agir dessus est une bonne nouvelle, donc jamais de rouge : un dégradé bleu indique
   * l'ampleur du gain attendu, pas un danger.
   */
  context?: "risque" | "solution";
  /** false : badge posé seul (ex. sous-titre de carte) — sans la marge prévue pour un badge collé après un texte. */
  inline?: boolean;
}

/**
 * Badge d'impact sur le score de vulnérabilité. Affiché uniquement au moment pertinent
 * (réponse sélectionnée, ou carte de recommandation) pour rester lisible : jamais sur
 * toutes les options à la fois.
 */
export function ImpactBadge({ score, context = "risque", inline = true }: ImpactBadgeProps) {
  const niveau = getNiveauVulnerabilite(score);
  const labels = context === "solution" ? LABELS_SOLUTION : LABELS_RISQUE;
  const couleurs = context === "solution" ? COULEURS_SOLUTION : COULEURS_RISQUE;

  return (
    <span
      className={`fr-badge fr-badge--sm${inline ? " fr-ml-1w" : ""}`}
      style={{ backgroundColor: couleurs[niveau], color: "#161616" }}>
      {labels[niveau]}
    </span>
  );
}
