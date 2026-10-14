import { QUESTION_LABELS } from "../value-objects/vulnerabilite-critere-fields";
import { compterPoints, type ComptePoints, type PointVulnerabilite } from "./categorisation.service";
import { getNiveauSynthese, type NiveauSynthese } from "./synthese-resultat.service";

const NB_POINTS_PRIORITAIRES = 3;

export interface ResumeVulnerabilite {
  niveau: NiveauSynthese;
  compte: ComptePoints;
  /** Libellés des questions à traiter d'abord : les points critiques, puis ceux de vigilance. */
  pointsPrioritaires: string[];
}

/** Version courte du résultat, pour l'encart du compte : jamais de score, seulement des niveaux. */
export function buildResumeVulnerabilite(points: PointVulnerabilite[]): ResumeVulnerabilite {
  const compte = compterPoints(points);
  const prioritaires = [
    ...points.filter((point) => point.categorie === "critique"),
    ...points.filter((point) => point.categorie === "vigilance"),
  ];

  return {
    niveau: getNiveauSynthese(compte),
    compte,
    pointsPrioritaires: prioritaires
      .slice(0, NB_POINTS_PRIORITAIRES)
      .map((point) => QUESTION_LABELS[point.critereId] ?? point.critereId),
  };
}
