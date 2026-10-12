import type {
  ReponseAleaRga,
  ReponsePenteTerrain,
  ReponseReseauxEnterres,
  ReponseGravierProprete,
  ReponseGouttieres,
  ReponseRecuperateurEau,
  ReponseArbreProximite,
  ReponseArbreEssence,
  ReponseHaies,
  ReponseVegetationPiedFacade,
  ReponseMitoyennete,
  ReponseEnsoleillement,
  ReponseSourceChaleurSousSol,
} from "../types/vulnerabilite-reponses.types";

/**
 * Grille de catégorisation du simulateur de vulnérabilité RGA (ADR-0045).
 *
 * SEUL fichier à modifier pour ajuster la méthode : chaque réponse porte sa `categorie`,
 * aucun composant ni service n'en décide. Les catégories sont fournies par le métier.
 */

export type CategorieReponse = "critique" | "vigilance" | "a_verifier" | "bonne_pratique" | "sans_objet";

/** Catégories qui produisent un label ; `sans_objet` n'est ni affiché ni comptabilisé. */
export type CategorieAffichee = Exclude<CategorieReponse, "sans_objet">;

/** Catégories qui produisent un point dans le résultat, dans l'ordre des sections. */
export const CATEGORIES_A_TRAITER = ["critique", "vigilance", "a_verifier"] as const;
export type CategorieATraiter = (typeof CATEGORIES_A_TRAITER)[number];

export interface CategorieAffichage {
  /** Label posé sur une réponse. */
  label: string;
  /** Titre de la section de l'écran de résultat et libellé de comptage. */
  pluriel: string;
  /** Fond du badge, repris du code couleur des anciens labels d'impact. */
  couleur: string;
  /** Liseré des fiches et des en-têtes de section : jeton DSFR à l'écran, sa valeur claire dans le PDF. */
  accent: { token: string; hex: string };
  /** Explication affichée sous la réponse sélectionnée et sous le titre de la section de résultat. */
  explication?: string;
}

export const CATEGORIES_AFFICHAGE: Record<CategorieAffichee, CategorieAffichage> = {
  critique: {
    label: "Point critique",
    pluriel: "Points critiques",
    couleur: "#FFC7C7",
    accent: { token: "var(--border-plain-error)", hex: "#CE0500" },
  },
  vigilance: {
    label: "Point de vigilance",
    pluriel: "Points de vigilance",
    couleur: "#FEECC2",
    accent: { token: "var(--yellow-moutarde-main-679)", hex: "#C3992A" },
  },
  a_verifier: {
    label: "À surveiller",
    pluriel: "Points à surveiller",
    couleur: "#E8EDFF",
    accent: { token: "var(--border-plain-blue-ecume)", hex: "#2F4077" },
    explication:
      "A priori sans problème si tout est en bon état. Mais une fuite, un défaut d'entretien ou un changement autour de la maison peut en faire un point critique : assurez-vous de votre réponse et contrôlez-le régulièrement.",
  },
  bonne_pratique: {
    label: "Bonne pratique en place",
    pluriel: "Bonnes pratiques en place",
    couleur: "#B8FEC9",
    accent: { token: "var(--border-plain-green-emeraude)", hex: "#00A95F" },
  },
};

export function getCategorieAffichage(categorie: CategorieReponse | null): CategorieAffichage | null {
  if (categorie === null || categorie === "sans_objet") return null;
  return CATEGORIES_AFFICHAGE[categorie];
}

export interface ReponseConfig<TReponse extends string = string> {
  reponse: TReponse;
  label: string;
  /** Précision affichée sous le libellé (exemples, seuils). */
  precision?: string;
  categorie: CategorieReponse;
}

export interface CritereConfig {
  id: string;
  reponses: ReponseConfig[];
  /** Ce critère ne s'applique que si un autre critère a la réponse indiquée (ex : essence ⇐ arbre proche = "oui"). */
  conditionnelA?: { critereId: string; reponseRequise: string };
}

/** L'aléa est une donnée de contexte issue de la carte : il n'entre pas dans la catégorisation. */
export const ALEA_RGA_LABELS: Record<ReponseAleaRga, string> = {
  fort: "Aléa fort",
  moyen: "Aléa moyen",
  faible: "Aléa faible",
  nul: "Hors zone argileuse",
};

export const ALEA_RGA_CRITERE_ID = "aleaRga";

export const CRITERES_CONFIG: CritereConfig[] = [
  // --- eaux ---
  {
    id: "pente_terrain",
    reponses: [
      { reponse: "vers_facade", label: "La pente descend vers une façade", categorie: "vigilance" },
      { reponse: "ne_sais_pas", label: "Je ne sais pas", categorie: "a_verifier" },
      { reponse: "plat", label: "Le terrain est plat", categorie: "a_verifier" },
      { reponse: "eloignee_facade", label: "La pente s'éloigne de la maison", categorie: "a_verifier" },
    ] satisfies ReponseConfig<ReponsePenteTerrain>[],
  },
  {
    id: "reseaux_enterres",
    reponses: [
      { reponse: "sous_fondations", label: "Sous les fondations", categorie: "critique" },
      { reponse: "proches", label: "Proches mais pas sous les fondations", categorie: "vigilance" },
      { reponse: "ne_sais_pas", label: "Je ne sais pas", categorie: "a_verifier" },
      { reponse: "eloignes", label: "Éloignés des fondations", categorie: "bonne_pratique" },
    ] satisfies ReponseConfig<ReponseReseauxEnterres>[],
  },
  {
    id: "gravier_proprete",
    reponses: [
      { reponse: "present_tout_pourtour", label: "Sur tout le pourtour de la maison", categorie: "critique" },
      { reponse: "present_localise", label: "Seulement à certains endroits", categorie: "vigilance" },
      // Sans gravier, ce qui borde le mur reste à regarder : pas une bonne pratique en soi.
      { reponse: "absent", label: "Absent", categorie: "a_verifier" },
    ] satisfies ReponseConfig<ReponseGravierProprete>[],
  },
  {
    id: "gouttieres",
    reponses: [
      { reponse: "absentes_ou_debordantes", label: "Absentes, débordantes ou mal entretenues", categorie: "vigilance" },
      { reponse: "ne_sais_pas", label: "Je ne sais pas", categorie: "a_verifier" },
      {
        reponse: "entretenues_evacuation_proche",
        label: "Entretenues, évacuation proche des fondations",
        categorie: "bonne_pratique",
      },
      {
        reponse: "entretenues_evacuation_loin",
        label: "Entretenues, évacuation loin des fondations",
        categorie: "bonne_pratique",
      },
    ] satisfies ReponseConfig<ReponseGouttieres>[],
  },
  {
    id: "recuperateur_eau",
    reponses: [
      { reponse: "present_fuite_ou_mal_raccorde", label: "Présent, mais fuit ou mal raccordé", categorie: "vigilance" },
      { reponse: "ne_sais_pas", label: "Je ne sais pas dans quel état il est", categorie: "a_verifier" },
      { reponse: "present_bon_etat", label: "Présent, en bon état et bien raccordé", categorie: "a_verifier" },
      { reponse: "absent", label: "Pas de récupérateur d'eau", categorie: "bonne_pratique" },
    ] satisfies ReponseConfig<ReponseRecuperateurEau>[],
  },

  // --- végétation ---
  {
    id: "arbre_proximite",
    reponses: [
      // Le point est porté par l'essence, posée sur le même écran dès qu'un arbre est signalé.
      { reponse: "oui", label: "Un arbre est proche des fondations", categorie: "sans_objet" },
      { reponse: "ne_sais_pas", label: "Je ne sais pas", categorie: "a_verifier" },
      { reponse: "non", label: "Aucun arbre proche", categorie: "bonne_pratique" },
    ] satisfies ReponseConfig<ReponseArbreProximite>[],
  },
  {
    id: "arbre_essence",
    // Groupes tirés de Cutler et Richardson (1989), du guide RGA du ministère et de NHBC 4.2 pour les conifères.
    conditionnelA: { critereId: "arbre_proximite", reponseRequise: "oui" },
    reponses: [
      {
        reponse: "tres_gourmand",
        label: "Grand arbre très gourmand en eau",
        precision: "Chêne, peuplier, saule, frêne, cèdre, cyprès (dont cyprès de Leyland)",
        categorie: "critique",
      },
      {
        reponse: "grand_ornement",
        label: "Grand arbre d'ornement ou conifère",
        precision: "Érable, platane, tilleul, marronnier, robinier (acacia), hêtre, orme, pin, sapin, épicéa, if",
        categorie: "critique",
      },
      {
        reponse: "fruitier_petit",
        label: "Arbre fruitier ou petit arbre",
        precision: "Pommier, poirier, prunier, cerisier, sorbier, bouleau, aubépine",
        categorie: "vigilance",
      },
      // Sans essence connue, on retient l'hypothèse prudente.
      { reponse: "ne_sais_pas", label: "Autre essence ou je ne sais pas", categorie: "critique" },
    ] satisfies ReponseConfig<ReponseArbreEssence>[],
  },
  {
    id: "haies",
    reponses: [
      { reponse: "proches_denses", label: "Proche des fondations et dense", categorie: "critique" },
      {
        reponse: "proches_moyennement_denses",
        label: "Proche des fondations, moyennement dense",
        categorie: "vigilance",
      },
      { reponse: "ne_sais_pas", label: "Je ne sais pas", categorie: "a_verifier" },
      { reponse: "eloignees_peu_denses", label: "Éloignée des fondations et peu dense", categorie: "bonne_pratique" },
    ] satisfies ReponseConfig<ReponseHaies>[],
  },
  {
    id: "vegetation_pied_facade",
    reponses: [
      { reponse: "presente", label: "Présente (potager, rosiers, arbustes...)", categorie: "critique" },
      { reponse: "absente", label: "Absente", categorie: "bonne_pratique" },
    ] satisfies ReponseConfig<ReponseVegetationPiedFacade>[],
  },

  // --- environnement et exposition ---
  {
    id: "mitoyennete",
    reponses: [
      {
        reponse: "mitoyen_voisin_sans_travaux",
        label: "Mitoyenne, voisin sans travaux de prévention",
        categorie: "a_verifier",
      },
      {
        reponse: "mitoyen_voisin_travaux_prevention",
        label: "Mitoyenne, voisin déjà en travaux de prévention",
        categorie: "bonne_pratique",
      },
      { reponse: "pas_mitoyen", label: "Maison individuelle, non mitoyenne", categorie: "bonne_pratique" },
    ] satisfies ReponseConfig<ReponseMitoyennete>[],
  },
  {
    id: "ensoleillement",
    reponses: [
      { reponse: "fort_sud", label: "Très ensoleillé, exposition sud sans protection", categorie: "vigilance" },
      { reponse: "modere", label: "Mi-ombre", categorie: "sans_objet" },
      {
        reponse: "faible_ombrage",
        label: "Peu ensoleillé, ombragé une bonne partie de la journée",
        categorie: "bonne_pratique",
      },
    ] satisfies ReponseConfig<ReponseEnsoleillement>[],
  },
  {
    id: "source_chaleur_sous_sol",
    reponses: [
      { reponse: "oui_mur_isole", label: "Oui, sur un mur isolé", categorie: "a_verifier" },
      { reponse: "oui_mur_non_isole", label: "Oui, sur un mur non isolé", categorie: "critique" },
      { reponse: "non", label: "Non", categorie: "bonne_pratique" },
      { reponse: "pas_de_sous_sol", label: "Pas de sous-sol", categorie: "sans_objet" },
    ] satisfies ReponseConfig<ReponseSourceChaleurSousSol>[],
  },
];

export function getCritereConfig(critereId: string): CritereConfig | undefined {
  return CRITERES_CONFIG.find((c) => c.id === critereId);
}
