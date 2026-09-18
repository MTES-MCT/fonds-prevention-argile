import type { NiveauVulnerabilite } from "../services/scoring.service";

/**
 * Labels et couleurs des badges de niveau, partagés entre `ImpactBadge` (HTML) et le PDF
 * téléchargeable — mêmes seuils que la jauge de résultat (`VulnerabiliteGauge`), un seul
 * système de niveaux.
 */
/** Libellé court du niveau, tel qu'affiché sous la jauge (`VulnerabiliteGauge`) et dans le PDF. */
export const NIVEAU_LABELS: Record<NiveauVulnerabilite, string> = {
  faible: "Faible",
  modere: "Modérée",
  eleve: "Élevée",
  tres_eleve: "Très élevée",
};

export const LABELS_RISQUE: Record<NiveauVulnerabilite, string> = {
  faible: "Impact faible",
  modere: "Impact modéré",
  eleve: "Impact élevé",
  tres_eleve: "Impact très élevé",
};

export const COULEURS_RISQUE: Record<NiveauVulnerabilite, string> = {
  faible: "#B8FEC9",
  modere: "#FEECC2",
  eleve: "#FFD5C7",
  tres_eleve: "#FFC7C7",
};

export const LABELS_SOLUTION: Record<NiveauVulnerabilite, string> = {
  faible: "Gain potentiel faible",
  modere: "Gain potentiel modéré",
  eleve: "Gain potentiel élevé",
  tres_eleve: "Gain potentiel très élevé",
};

/**
 * Dégradé vert DSFR (`green-emeraude`, jamais rouge) : agir sur une recommandation est
 * toujours une bonne nouvelle — plus le gain potentiel est élevé, plus le vert est foncé.
 */
export const COULEURS_SOLUTION: Record<NiveauVulnerabilite, string> = {
  faible: "#E3FDEB",
  modere: "#C3FAD5",
  eleve: "#9EF9BE",
  tres_eleve: "#6FE49D",
};
