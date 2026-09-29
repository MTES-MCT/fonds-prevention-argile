import type { NiveauVulnerabilite } from "../services/scoring.service";

/**
 * Labels et couleurs des badges de niveau, partagés entre `ImpactBadge` (HTML) et le PDF
 * téléchargeable — mêmes seuils que la jauge de résultat (`VulnerabiliteGauge`), un seul
 * système de niveaux.
 */
/** Libellé court du niveau, tel qu'affiché sous la jauge (`VulnerabiliteGauge`) et dans le PDF. */
export const NIVEAU_LABELS: Record<NiveauVulnerabilite, string> = {
  faible: "Faible",
  moyen: "Moyenne",
  fort: "Forte",
};

export const LABELS_RISQUE: Record<NiveauVulnerabilite, string> = {
  faible: "Impact faible",
  moyen: "Impact moyen",
  fort: "Impact fort",
};

export const COULEURS_RISQUE: Record<NiveauVulnerabilite, string> = {
  faible: "#B8FEC9",
  moyen: "#FEECC2",
  fort: "#FFC7C7",
};

export const LABELS_SOLUTION: Record<NiveauVulnerabilite, string> = {
  faible: "Gain potentiel faible",
  moyen: "Gain potentiel moyen",
  fort: "Gain potentiel fort",
};

/**
 * Dégradé vert DSFR (`green-emeraude`, jamais rouge) : agir sur une recommandation est
 * toujours une bonne nouvelle — plus le gain potentiel est élevé, plus le vert est foncé.
 */
export const COULEURS_SOLUTION: Record<NiveauVulnerabilite, string> = {
  faible: "#E3FDEB",
  moyen: "#9EF9BE",
  fort: "#6FE49D",
};
