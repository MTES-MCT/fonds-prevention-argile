import type {
  ReponseAleaRga,
  ReponsePenteTerrain,
  ReponseReseauxEnterres,
  ReponseGravierProprete,
  ReponseGouttieres,
  ReponseRecuperateurEau,
  ReponseArbreProximite,
  ReponseHaies,
  ReponseVegetationPiedFacade,
  ReponseMitoyennete,
  ReponseEnsoleillement,
} from "../types/vulnerabilite-reponses.types";

/**
 * Grille de pondération du simulateur de vulnérabilité RGA.
 *
 * SEUL fichier à modifier pour ajuster la méthode de calcul (barème par réponse). Toute la
 * logique de calcul (scoring.service.ts) lit ces constantes — elle ne contient elle-même
 * aucun chiffre.
 *
 * Pas de pondération de catégorie ni de critère (retirée volontairement) : cumuler un poids
 * de catégorie ET un poids de critère rendait impossible de savoir si un mauvais score
 * "eaux" était plus grave qu'un mauvais score "végétation". Seul le barème par réponse reste
 * — chaque critère répondu compte à égalité dans `scoring.service.ts` (moyenne quadratique).
 *
 * Les scores ci-dessous sont des valeurs de départ, PAS une méthode validée par un expert
 * RGA. `grille-ponderation.test.ts` garantit seulement leur cohérence interne (barèmes dans
 * [0,100]), pas leur pertinence métier.
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
  bareme: BaremeReponse<TReponse>[];
  /** Ce critère n'est noté que si un autre critère a la réponse indiquée (ex : essence ⇐ arbre proche = "oui"). */
  conditionnelA?: { critereId: string; reponseRequise: string };
}

export interface CategorieConfig {
  id: CategorieVulnerabilite;
  label: string;
  /** false = catégorie subie (non actionnable par le propriétaire) : jamais de recommandation générée. */
  actionnable: boolean;
}

// ---------------------------------------------------------------------------
// Catégories — regroupement d'affichage uniquement (stats admin, filtre des
// recommandations sur `actionnable`) : ne pèsent plus dans le calcul du score.
// ---------------------------------------------------------------------------
export const CATEGORIES_CONFIG: CategorieConfig[] = [
  { id: "sol", label: "Nature du sol (aléa RGA)", actionnable: false },
  { id: "eaux", label: "Gestion des eaux", actionnable: true },
  { id: "vegetation", label: "Gestion de la végétation", actionnable: true },
  { id: "divers", label: "Environnement et exposition", actionnable: true },
];

// ---------------------------------------------------------------------------
// Critères et barèmes — DEFAULT, à valider par un expert RGA.
// ---------------------------------------------------------------------------
export const CRITERES_CONFIG: CritereConfig[] = [
  // --- sol ---
  {
    id: "aleaRga",
    categorie: "sol",
    bareme: [
      { reponse: "fort", score: 100, label: "Aléa fort" },
      { reponse: "moyen", score: 50, label: "Aléa moyen" },
      { reponse: "faible", score: 15, label: "Aléa faible" },
      { reponse: "nul", score: 0, label: "Hors zone argileuse" },
    ] satisfies BaremeReponse<ReponseAleaRga>[],
  },

  // --- eaux ---
  {
    id: "pente_terrain",
    categorie: "eaux",
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
    bareme: [
      // Sur tout le pourtour : l'ensemble du contour des fondations subit les mêmes cycles
      // d'infiltration, donc un tassement différentiel généralisé — pire qu'un point localisé.
      { reponse: "present_tout_pourtour", score: 100, label: "Sur tout le pourtour de la maison" },
      { reponse: "present_localise", score: 60, label: "Seulement à certains endroits" },
      { reponse: "absent", score: 0, label: "Absent" },
    ] satisfies BaremeReponse<ReponseGravierProprete>[],
  },
  {
    id: "gouttieres",
    categorie: "eaux",
    bareme: [
      { reponse: "absentes_ou_debordantes", score: 100, label: "Absentes, débordantes ou mal entretenues" },
      { reponse: "ne_sais_pas", score: 55, label: "Je ne sais pas" },
      { reponse: "entretenues_evacuation_proche", score: 40, label: "Entretenues, évacuation proche des fondations" },
      { reponse: "entretenues_evacuation_loin", score: 0, label: "Entretenues, évacuation loin des fondations" },
    ] satisfies BaremeReponse<ReponseGouttieres>[],
  },
  {
    id: "recuperateur_eau",
    categorie: "eaux",
    bareme: [
      // Collé à la descente de gouttière et donc au pied de façade par construction : une
      // fuite ou un mauvais raccordement y déverse l'eau au même endroit qu'une gouttière
      // défaillante — d'où un barème calqué sur celui des gouttières.
      { reponse: "present_fuite_ou_mal_raccorde", score: 100, label: "Présent, mais fuit ou mal raccordé" },
      { reponse: "ne_sais_pas", score: 55, label: "Je ne sais pas dans quel état il est" },
      { reponse: "present_bon_etat", score: 15, label: "Présent, en bon état et bien raccordé" },
      { reponse: "absent", score: 0, label: "Pas de récupérateur d'eau" },
    ] satisfies BaremeReponse<ReponseRecuperateurEau>[],
  },

  // --- vegetation ---
  {
    id: "arbre_proximite",
    categorie: "vegetation",
    bareme: [
      { reponse: "oui", score: 100, label: "Un arbre est proche des fondations" },
      { reponse: "ne_sais_pas", score: 50, label: "Je ne sais pas" },
      { reponse: "non", score: 0, label: "Aucun arbre proche" },
    ] satisfies BaremeReponse<ReponseArbreProximite>[],
  },
  {
    id: "arbre_essence",
    categorie: "vegetation",
    conditionnelA: { critereId: "arbre_proximite", reponseRequise: "oui" },
    // Barème dérivé de ESSENCES_AGRESSIVITE (ci-dessous), pas dupliqué ici — voir scoring.service.ts.
    bareme: [],
  },
  {
    id: "haies",
    categorie: "vegetation",
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
    bareme: [
      // Décision validée : à supprimer d'office si présente → risque maximal binaire.
      { reponse: "presente", score: 100, label: "Présente (potager, rosiers, arbustes...)" },
      { reponse: "absente", score: 0, label: "Absente" },
    ] satisfies BaremeReponse<ReponseVegetationPiedFacade>[],
  },

  // --- divers ---
  {
    id: "mitoyennete",
    categorie: "divers",
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
    bareme: [
      { reponse: "fort_sud", score: 100, label: "Très ensoleillé, exposition sud sans protection" },
      { reponse: "modere", score: 40, label: "Mi-ombre" },
      { reponse: "faible_ombrage", score: 0, label: "Peu ensoleillé, ombragé une bonne partie de la journée" },
    ] satisfies BaremeReponse<ReponseEnsoleillement>[],
  },
];

// ---------------------------------------------------------------------------
// ⚠️ GRILLE PROVISOIRE — en attente de la table d'agressivité définitive fournie
// par l'expert métier. Remplacer UNIQUEMENT ce bloc (aucun autre fichier à toucher).
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
