import {
  CATEGORIES_CONFIG,
  CRITERES_CONFIG,
  ESSENCES_AGRESSIVITE,
  getCategorieConfig,
  getCritereConfig,
  type CategorieVulnerabilite,
  type CritereConfig,
} from "../value-objects/grille-ponderation";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

export interface CritereScoreDetail {
  critereId: string;
  categorie: CategorieVulnerabilite;
  reponse?: string;
  /** 0-100, ou null si le critère n'a pas été répondu ou ne s'applique pas (ex: arbre_essence sans arbre proche). */
  score: number | null;
  /** Fraction 0-1 : (poids de la catégorie / 100) × (poids du critère dans sa catégorie / 100). */
  poidsGlobal: number;
}

export interface VulnerabiliteScoreResult {
  scoreGlobal: number;
  scoreParCategorie: Record<CategorieVulnerabilite, number | null>;
  details: CritereScoreDetail[];
}

export type NiveauVulnerabilite = "faible" | "modere" | "eleve" | "tres_eleve";

const SEUILS_NIVEAU: { max: number; niveau: NiveauVulnerabilite }[] = [
  { max: 25, niveau: "faible" },
  { max: 50, niveau: "modere" },
  { max: 75, niveau: "eleve" },
  { max: Infinity, niveau: "tres_eleve" },
];

export function getNiveauVulnerabilite(score: number): NiveauVulnerabilite {
  const seuil = SEUILS_NIVEAU.find((s) => score < s.max);
  return seuil?.niveau ?? "tres_eleve";
}

/** Lit la réponse d'un critère dans les réponses collectées, par section. */
function getReponseForCritere(critereId: string, answers: PartialVulnerabiliteReponses): string | undefined {
  switch (critereId) {
    case "aleaRga":
      return answers.adresse?.aleaRga;
    case "pente_terrain":
      return answers.eaux?.pente_terrain;
    case "reseaux_enterres":
      return answers.eaux?.reseaux_enterres;
    case "gravier_proprete":
      return answers.eaux?.gravier_proprete;
    case "gouttieres":
      return answers.eaux?.gouttieres;
    case "arbre_proximite":
      return answers.vegetation?.arbre_proximite;
    case "arbre_essence":
      return answers.vegetation?.arbre_essence;
    case "haies":
      return answers.vegetation?.haies;
    case "vegetation_pied_facade":
      return answers.vegetation?.vegetation_pied_facade;
    case "mitoyennete":
      return answers.divers?.mitoyennete;
    case "ensoleillement":
      return answers.divers?.ensoleillement;
    default:
      return undefined;
  }
}

function isCritereApplicable(critere: CritereConfig, answers: PartialVulnerabiliteReponses): boolean {
  if (!critere.conditionnelA) return true;
  return getReponseForCritere(critere.conditionnelA.critereId, answers) === critere.conditionnelA.reponseRequise;
}

function getScoreForReponse(critere: CritereConfig, reponse: string): number | null {
  if (critere.id === "arbre_essence") {
    return ESSENCES_AGRESSIVITE[reponse]?.score ?? null;
  }
  return critere.bareme.find((b) => b.reponse === reponse)?.score ?? null;
}

/**
 * Score 0-100 (0 = idéal, 100 = risque maximal) d'une réponse précise pour un critère,
 * indépendamment de tout parcours en cours — utilisé pour afficher l'impact d'un choix
 * au moment où l'utilisateur le sélectionne (`ImpactBadge`), et celui d'une recommandation
 * sur l'écran de résultat.
 */
export function getImpactScore(critereId: string, reponse: string): number | null {
  const critere = getCritereConfig(critereId);
  if (!critere) return null;
  return getScoreForReponse(critere, reponse);
}

/** Moyenne pondérée ignorant les entrées `score: null` (non répondues/non applicables), dénominateur renormalisé. */
function weightedAverage(entries: { score: number | null; poids: number }[]): number | null {
  const applicables = entries.filter((e): e is { score: number; poids: number } => e.score !== null);
  const poidsTotal = applicables.reduce((acc, e) => acc + e.poids, 0);
  if (poidsTotal === 0) return null;
  const somme = applicables.reduce((acc, e) => acc + e.score * e.poids, 0);
  return somme / poidsTotal;
}

/**
 * Calcule le score de vulnérabilité (0-100) à partir des réponses collectées.
 * Robuste à un parcours incomplet : les critères non répondus (ou non applicables,
 * ex. arbre_essence sans arbre proche) sont exclus du calcul, pas comptés comme "bons".
 */
export function computeScoreResult(answers: PartialVulnerabiliteReponses): VulnerabiliteScoreResult {
  const details: CritereScoreDetail[] = CRITERES_CONFIG.map((critere) => {
    const categorieConfig = getCategorieConfig(critere.categorie);
    const poidsGlobal = (categorieConfig.poids / 100) * (critere.poids / 100);
    const applicable = isCritereApplicable(critere, answers);
    const reponse = applicable ? getReponseForCritere(critere.id, answers) : undefined;
    const score = reponse !== undefined ? getScoreForReponse(critere, reponse) : null;

    return { critereId: critere.id, categorie: critere.categorie, reponse, score, poidsGlobal };
  });

  const scoreParCategorie = {} as Record<CategorieVulnerabilite, number | null>;
  for (const categorie of CATEGORIES_CONFIG) {
    const critDetails = details.filter((d) => d.categorie === categorie.id);
    scoreParCategorie[categorie.id] = weightedAverage(
      critDetails.map((d) => ({
        score: d.score,
        poids: CRITERES_CONFIG.find((c) => c.id === d.critereId)?.poids ?? 0,
      }))
    );
  }

  const scoreGlobal = weightedAverage(
    CATEGORIES_CONFIG.map((cat) => ({ score: scoreParCategorie[cat.id], poids: cat.poids }))
  );

  return {
    scoreGlobal: Math.round(scoreGlobal ?? 0),
    scoreParCategorie,
    details,
  };
}
