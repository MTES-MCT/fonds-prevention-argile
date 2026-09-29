import {
  CATEGORIES_CONFIG,
  CRITERES_CONFIG,
  ESSENCES_AGRESSIVITE,
  getCritereConfig,
  type CategorieVulnerabilite,
  type CritereConfig,
} from "../value-objects/grille-ponderation";
import { toReponsesParCritere, type ReponsesParCritere } from "../value-objects/vulnerabilite-critere-fields";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

export interface CritereScoreDetail {
  critereId: string;
  categorie: CategorieVulnerabilite;
  reponse?: string;
  /** 0-100, ou null si le critère n'a pas été répondu ou ne s'applique pas (ex: arbre_essence sans arbre proche). */
  score: number | null;
}

export interface VulnerabiliteScoreResult {
  scoreGlobal: number;
  scoreParCategorie: Record<CategorieVulnerabilite, number | null>;
  details: CritereScoreDetail[];
}

export type NiveauVulnerabilite = "faible" | "moyen" | "fort";

const SEUILS_NIVEAU: { max: number; niveau: NiveauVulnerabilite }[] = [
  { max: 34, niveau: "faible" },
  { max: 67, niveau: "moyen" },
  { max: Infinity, niveau: "fort" },
];

export function getNiveauVulnerabilite(score: number): NiveauVulnerabilite {
  const seuil = SEUILS_NIVEAU.find((s) => score < s.max);
  return seuil?.niveau ?? "fort";
}

function isCritereApplicable(critere: CritereConfig, reponses: ReponsesParCritere): boolean {
  if (!critere.conditionnelA) return true;
  return reponses[critere.conditionnelA.critereId] === critere.conditionnelA.reponseRequise;
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

/**
 * Moyenne quadratique (RMS) des scores non nuls, dénominateur renormalisé sur les entrées
 * répondues/applicables. Contrairement à une moyenne simple, les scores élevés pèsent
 * mécaniquement plus lourd dans le total : cumuler plusieurs sources de vulnérabilité fait
 * donc monter le score plus vite que si elles étaient isolées les unes des autres — sans
 * pour autant réintroduire de pondération par catégorie ou par critère.
 */
function quadraticMean(scores: (number | null)[]): number | null {
  const applicables = scores.filter((s): s is number => s !== null);
  if (applicables.length === 0) return null;
  const sommeCarres = applicables.reduce((acc, s) => acc + s * s, 0);
  return Math.sqrt(sommeCarres / applicables.length);
}

/**
 * Calcule le score de vulnérabilité (0-100) à partir des réponses aplaties.
 * Robuste à un parcours incomplet : les critères non répondus (ou non applicables,
 * ex. arbre_essence sans arbre proche) sont exclus du calcul, pas comptés comme "bons".
 * Fonction pure : c'est elle que le serveur rejoue pour ne pas dépendre du score client.
 */
export function computeScoreFromReponses(reponses: ReponsesParCritere): VulnerabiliteScoreResult {
  const details: CritereScoreDetail[] = CRITERES_CONFIG.map((critere) => {
    const applicable = isCritereApplicable(critere, reponses);
    const reponse = applicable ? reponses[critere.id] : undefined;
    const score = reponse !== undefined ? getScoreForReponse(critere, reponse) : null;

    return { critereId: critere.id, categorie: critere.categorie, reponse, score };
  });

  const scoreParCategorie = {} as Record<CategorieVulnerabilite, number | null>;
  for (const categorie of CATEGORIES_CONFIG) {
    const critDetails = details.filter((d) => d.categorie === categorie.id);
    const moyenne = quadraticMean(critDetails.map((d) => d.score));
    scoreParCategorie[categorie.id] = moyenne !== null ? Math.round(moyenne) : null;
  }

  const scoreGlobal = quadraticMean(details.map((d) => d.score));

  return {
    scoreGlobal: Math.round(scoreGlobal ?? 0),
    scoreParCategorie,
    details,
  };
}

/** Même calcul, à partir des réponses collectées section par section (parcours en cours). */
export function computeScoreResult(answers: PartialVulnerabiliteReponses): VulnerabiliteScoreResult {
  return computeScoreFromReponses(toReponsesParCritere(answers));
}
