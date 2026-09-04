import { getNiveauVulnerabilite, type NiveauVulnerabilite } from "../../domain/services/scoring.service";

interface ImpactBadgeProps {
  /** Score 0-100 de la réponse ou du critère concerné (0 = idéal, 100 = risque maximal). */
  score: number;
}

/** Mêmes seuils et couleurs que la jauge de résultat (VulnerabiliteGauge) — un seul vocabulaire visuel. */
const NIVEAU_LABELS: Record<NiveauVulnerabilite, string> = {
  faible: "Impact faible",
  modere: "Impact modéré",
  eleve: "Impact élevé",
  tres_eleve: "Impact très élevé",
};

const NIVEAU_COULEURS: Record<NiveauVulnerabilite, string> = {
  faible: "#B8FEC9",
  modere: "#FEECC2",
  eleve: "#FFD5C7",
  tres_eleve: "#FFC7C7",
};

/**
 * Badge d'impact d'une réponse (ou d'une recommandation) sur le score de vulnérabilité.
 * Affiché uniquement au moment pertinent (réponse sélectionnée, ou carte de recommandation)
 * pour rester lisible : jamais sur toutes les options à la fois.
 */
export function ImpactBadge({ score }: ImpactBadgeProps) {
  const niveau = getNiveauVulnerabilite(score);

  return (
    <span
      className="fr-badge fr-badge--sm fr-ml-1w"
      style={{ backgroundColor: NIVEAU_COULEURS[niveau], color: "#161616" }}>
      {NIVEAU_LABELS[niveau]}
    </span>
  );
}
