import type {
  ReponseAleaRga,
  ReponsePenteTerrain,
  ReponseReseauxEnterres,
  ReponseGravierProprete,
  ReponseGouttieres,
  ReponseArbreProximite,
  ReponseHaies,
  ReponseVegetationPiedFacade,
  ReponseMitoyennete,
  ReponseEnsoleillement,
} from "../types/vulnerabilite-reponses.types";

/**
 * Grille de pondération du simulateur de vulnérabilité RGA.
 *
 * SEUL fichier à modifier pour ajuster la méthode de calcul (poids des catégories,
 * poids des critères, barème par réponse). Toute la logique de calcul (scoring.service.ts)
 * lit ces constantes — elle ne contient elle-même aucun chiffre.
 *
 * Les poids ci-dessous sont des valeurs de départ, PAS une méthode validée par un expert
 * RGA. `grille-ponderation.test.ts` garantit seulement leur cohérence interne (les sommes
 * tombent juste), pas leur pertinence métier.
 */

export type CategorieVulnerabilite = "sol" | "eaux" | "vegetation" | "divers";

export interface BaremeReponse<TReponse extends string = string> {
  reponse: TReponse;
  /** 0 = idéal (aucun risque), 100 = risque maximal. */
  score: number;
  label: string;
}

export interface CritereConfig<TReponse extends string = string> {
  id: string;
  categorie: CategorieVulnerabilite;
  /** Poids du critère DANS sa catégorie — la somme des critères d'une catégorie doit faire 100. */
  poids: number;
  bareme: BaremeReponse<TReponse>[];
  /** Ce critère n'est noté que si un autre critère a la réponse indiquée (ex : essence ⇐ arbre proche = "oui"). */
  conditionnelA?: { critereId: string; reponseRequise: string };
}

export interface CategorieConfig {
  id: CategorieVulnerabilite;
  label: string;
  /** Poids de la catégorie dans le score global — la somme des 4 catégories doit faire 100. */
  poids: number;
  /** false = catégorie subie (non actionnable par le propriétaire) : jamais de recommandation générée. */
  actionnable: boolean;
}

// ---------------------------------------------------------------------------
// Catégories — DEFAULT, à valider par un expert RGA.
// 70 % du score porte sur l'environnement proche (le seul levier actionnable),
// 30 % sur l'aléa du sol (subi, mais il fixe le niveau de risque de base).
// ---------------------------------------------------------------------------
export const CATEGORIES_CONFIG: CategorieConfig[] = [
  { id: "sol", label: "Nature du sol (aléa RGA)", poids: 30, actionnable: false },
  { id: "eaux", label: "Gestion des eaux", poids: 25, actionnable: true },
  { id: "vegetation", label: "Gestion de la végétation", poids: 25, actionnable: true },
  { id: "divers", label: "Environnement et exposition", poids: 20, actionnable: true },
];

// ---------------------------------------------------------------------------
// Critères et barèmes — DEFAULT, à valider par un expert RGA.
// ---------------------------------------------------------------------------
export const CRITERES_CONFIG: CritereConfig[] = [
  // --- sol (poids critères = 100) ---
  {
    id: "aleaRga",
    categorie: "sol",
    poids: 100,
    bareme: [
      { reponse: "fort", score: 100, label: "Aléa fort" },
      { reponse: "moyen", score: 50, label: "Aléa moyen" },
      { reponse: "faible", score: 15, label: "Aléa faible" },
      { reponse: "nul", score: 0, label: "Hors zone argileuse" },
    ] satisfies BaremeReponse<ReponseAleaRga>[],
  },

  // --- eaux (poids critères = 100 : 20+25+20+35) ---
  {
    id: "pente_terrain",
    categorie: "eaux",
    poids: 20,
    bareme: [
      { reponse: "vers_facade", score: 100, label: "La pente descend vers une façade" },
      { reponse: "ne_sais_pas", score: 60, label: "Je ne sais pas" },
      // Plat draine moins bien qu'une pente qui s'éloigne activement (l'eau peut stagner).
      { reponse: "plat", score: 30, label: "Le terrain est plat" },
      { reponse: "eloignee_facade", score: 0, label: "La pente s'éloigne de la maison" },
    ] satisfies BaremeReponse<ReponsePenteTerrain>[],
  },
  {
    id: "reseaux_enterres",
    categorie: "eaux",
    poids: 25,
    bareme: [
      { reponse: "sous_fondations", score: 100, label: "Sous les fondations" },
      { reponse: "proches", score: 60, label: "Proches mais pas sous les fondations" },
      { reponse: "ne_sais_pas", score: 60, label: "Je ne sais pas" },
      { reponse: "eloignes", score: 0, label: "Éloignés des fondations" },
    ] satisfies BaremeReponse<ReponseReseauxEnterres>[],
  },
  {
    id: "gravier_proprete",
    categorie: "eaux",
    poids: 20,
    bareme: [
      // Décision validée : présence = risque (favorise l'infiltration / le tassement hydro-mécanique).
      { reponse: "present", score: 100, label: "Présent en pied de façade" },
      { reponse: "absent", score: 0, label: "Absent" },
    ] satisfies BaremeReponse<ReponseGravierProprete>[],
  },
  {
    id: "gouttieres",
    categorie: "eaux",
    poids: 35,
    bareme: [
      { reponse: "absentes_ou_debordantes", score: 100, label: "Absentes, débordantes ou mal entretenues" },
      { reponse: "ne_sais_pas", score: 55, label: "Je ne sais pas" },
      { reponse: "entretenues_evacuation_proche", score: 40, label: "Entretenues, évacuation proche des fondations" },
      { reponse: "entretenues_evacuation_loin", score: 0, label: "Entretenues, évacuation loin des fondations" },
    ] satisfies BaremeReponse<ReponseGouttieres>[],
  },

  // --- vegetation (poids critères = 100 : 15+25+25+35) ---
  {
    id: "arbre_proximite",
    categorie: "vegetation",
    poids: 15,
    bareme: [
      { reponse: "oui", score: 100, label: "Un arbre est proche des fondations" },
      { reponse: "ne_sais_pas", score: 50, label: "Je ne sais pas" },
      { reponse: "non", score: 0, label: "Aucun arbre proche" },
    ] satisfies BaremeReponse<ReponseArbreProximite>[],
  },
  {
    id: "arbre_essence",
    categorie: "vegetation",
    poids: 25,
    conditionnelA: { critereId: "arbre_proximite", reponseRequise: "oui" },
    // Barème dérivé de ESSENCES_AGRESSIVITE (ci-dessous), pas dupliqué ici — voir scoring.service.ts.
    bareme: [],
  },
  {
    id: "haies",
    categorie: "vegetation",
    poids: 25,
    bareme: [
      { reponse: "proches_denses", score: 100, label: "Proche des fondations et dense" },
      { reponse: "proches_moyennement_denses", score: 55, label: "Proche des fondations, moyennement dense" },
      { reponse: "ne_sais_pas", score: 55, label: "Je ne sais pas" },
      { reponse: "eloignees_peu_denses", score: 0, label: "Éloignée des fondations et peu dense" },
    ] satisfies BaremeReponse<ReponseHaies>[],
  },
  {
    id: "vegetation_pied_facade",
    categorie: "vegetation",
    poids: 35,
    bareme: [
      // Décision validée : à supprimer d'office si présente → risque maximal binaire.
      { reponse: "presente", score: 100, label: "Présente (potager, rosiers, arbustes...)" },
      { reponse: "absente", score: 0, label: "Absente" },
    ] satisfies BaremeReponse<ReponseVegetationPiedFacade>[],
  },

  // --- divers (poids critères = 100 : 45+55) ---
  {
    id: "mitoyennete",
    categorie: "divers",
    poids: 45,
    bareme: [
      { reponse: "mitoyen_voisin_sans_travaux", score: 100, label: "Mitoyenne, voisin sans travaux de prévention" },
      {
        reponse: "mitoyen_voisin_travaux_prevention",
        score: 20,
        label: "Mitoyenne, voisin déjà en travaux de prévention",
      },
      { reponse: "pas_mitoyen", score: 0, label: "Maison individuelle, non mitoyenne" },
    ] satisfies BaremeReponse<ReponseMitoyennete>[],
  },
  {
    id: "ensoleillement",
    categorie: "divers",
    poids: 55,
    bareme: [
      { reponse: "fort_sud", score: 100, label: "Très ensoleillé, exposition sud sans protection" },
      { reponse: "modere", score: 40, label: "Mi-ombre" },
      { reponse: "faible_ombrage", score: 0, label: "Peu ensoleillé, ombragé une bonne partie de la journée" },
    ] satisfies BaremeReponse<ReponseEnsoleillement>[],
  },
];

// ---------------------------------------------------------------------------
// ⚠️ GRILLE PROVISOIRE — en attente de la table d'agressivité définitive fournie
// par l'expert métier. Remplacer UNIQUEMENT ce bloc (aucun autre fichier à modifier).
// ---------------------------------------------------------------------------
export const ESSENCES_AGRESSIVITE: Record<string, { score: number; label: string }> = {
  peuplier: { score: 100, label: "Peuplier" },
  saule: { score: 100, label: "Saule" },
  chene: { score: 75, label: "Chêne" },
  frene: { score: 75, label: "Frêne" },
  bouleau: { score: 50, label: "Bouleau" },
  erable: { score: 50, label: "Érable" },
  fruitier: { score: 25, label: "Arbre fruitier" },
  conifere: { score: 25, label: "Conifère" },
  autre: { score: 60, label: "Autre essence" },
  ne_sais_pas: { score: 70, label: "Je ne sais pas" },
};

export function getCritereConfig(critereId: string): CritereConfig | undefined {
  return CRITERES_CONFIG.find((c) => c.id === critereId);
}

export function getCategorieConfig(categorie: CategorieVulnerabilite): CategorieConfig {
  const config = CATEGORIES_CONFIG.find((c) => c.id === categorie);
  if (!config) throw new Error(`Catégorie de vulnérabilité inconnue : ${categorie}`);
  return config;
}
