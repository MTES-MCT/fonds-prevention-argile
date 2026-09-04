import { getNiveauVulnerabilite, type NiveauVulnerabilite } from "../../domain/services/scoring.service";

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
}

/** Mêmes seuils que la jauge de résultat (VulnerabiliteGauge) — un seul système de niveaux. */
const LABELS_RISQUE: Record<NiveauVulnerabilite, string> = {
  faible: "Impact faible",
  modere: "Impact modéré",
  eleve: "Impact élevé",
  tres_eleve: "Impact très élevé",
};

const COULEURS_RISQUE: Record<NiveauVulnerabilite, string> = {
  faible: "#B8FEC9",
  modere: "#FEECC2",
  eleve: "#FFD5C7",
  tres_eleve: "#FFC7C7",
};

const LABELS_SOLUTION: Record<NiveauVulnerabilite, string> = {
  faible: "Gain potentiel faible",
  modere: "Gain potentiel modéré",
  eleve: "Gain potentiel élevé",
  tres_eleve: "Gain potentiel très élevé",
};

/** Dégradé bleu (jamais rouge) : agir sur une recommandation est toujours une bonne nouvelle. */
const COULEURS_SOLUTION: Record<NiveauVulnerabilite, string> = {
  faible: "#E8EDFF",
  modere: "#C7D6FE",
  eleve: "#9EB6FC",
  tres_eleve: "#6A96F5",
};

/**
 * Badge d'impact sur le score de vulnérabilité. Affiché uniquement au moment pertinent
 * (réponse sélectionnée, ou carte de recommandation) pour rester lisible : jamais sur
 * toutes les options à la fois.
 */
export function ImpactBadge({ score, context = "risque" }: ImpactBadgeProps) {
  const niveau = getNiveauVulnerabilite(score);
  const labels = context === "solution" ? LABELS_SOLUTION : LABELS_RISQUE;
  const couleurs = context === "solution" ? COULEURS_SOLUTION : COULEURS_RISQUE;

  return (
    <span className="fr-badge fr-badge--sm fr-ml-1w" style={{ backgroundColor: couleurs[niveau], color: "#161616" }}>
      {labels[niveau]}
    </span>
  );
}
