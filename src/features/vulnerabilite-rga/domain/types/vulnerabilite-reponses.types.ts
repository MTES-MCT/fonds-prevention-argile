/** Aléa RGA du bâtiment, tel que renvoyé par `getRgaRiskLevel()` (`@/shared/services/bdnb`). */
export type ReponseAleaRga = "fort" | "moyen" | "faible" | "nul";

export interface VulnerabiliteAdresseReponses {
  label: string;
  communeNom: string | null;
  codeDepartement: string | null;
  coordonnees: string | null;
  clefBan: string | null;
  rnb: string | null;
  aleaRga: ReponseAleaRga;
}

export type ReponsePenteTerrain = "plat" | "eloignee_facade" | "vers_facade" | "ne_sais_pas";
export type ReponseReseauxEnterres = "eloignes" | "proches" | "sous_fondations" | "ne_sais_pas";
export type ReponseGravierProprete = "absent" | "present";
export type ReponseGouttieres =
  | "entretenues_evacuation_loin"
  | "entretenues_evacuation_proche"
  | "absentes_ou_debordantes"
  | "ne_sais_pas";

export interface VulnerabiliteEauxReponses {
  pente_terrain?: ReponsePenteTerrain;
  reseaux_enterres?: ReponseReseauxEnterres;
  gravier_proprete?: ReponseGravierProprete;
  gouttieres?: ReponseGouttieres;
}

export type ReponseArbreProximite = "oui" | "non" | "ne_sais_pas";
/** Clé dans `ESSENCES_AGRESSIVITE` (grille-ponderation.ts) — pas de type littéral figé ici pour ne pas dupliquer la liste. */
export type ReponseArbreEssence = string;
export type ReponseHaies = "eloignees_peu_denses" | "proches_moyennement_denses" | "proches_denses" | "ne_sais_pas";
export type ReponseVegetationPiedFacade = "absente" | "presente";

export interface VulnerabiliteVegetationReponses {
  arbre_proximite?: ReponseArbreProximite;
  arbre_essence?: ReponseArbreEssence;
  haies?: ReponseHaies;
  vegetation_pied_facade?: ReponseVegetationPiedFacade;
}

export type ReponseMitoyennete = "pas_mitoyen" | "mitoyen_voisin_travaux_prevention" | "mitoyen_voisin_sans_travaux";
export type ReponseEnsoleillement = "faible_ombrage" | "modere" | "fort_sud";

export interface VulnerabiliteDiversReponses {
  mitoyennete?: ReponseMitoyennete;
  ensoleillement?: ReponseEnsoleillement;
}

/** Réponses collectées au fil du parcours, section par section (miroir de `PartialRGASimulationData`). */
export interface PartialVulnerabiliteReponses {
  adresse?: VulnerabiliteAdresseReponses;
  eaux?: VulnerabiliteEauxReponses;
  vegetation?: VulnerabiliteVegetationReponses;
  divers?: VulnerabiliteDiversReponses;
}
