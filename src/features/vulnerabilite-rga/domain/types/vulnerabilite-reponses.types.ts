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
export type ReponseGravierProprete = "absent" | "present_localise" | "present_tout_pourtour";
export type ReponseGouttieres =
  "entretenues_evacuation_loin" | "entretenues_evacuation_proche" | "absentes_ou_debordantes" | "ne_sais_pas";
export type ReponseRecuperateurEau = "absent" | "present_bon_etat" | "present_fuite_ou_mal_raccorde" | "ne_sais_pas";

export interface VulnerabiliteEauxReponses {
  pente_terrain?: ReponsePenteTerrain;
  reseaux_enterres?: ReponseReseauxEnterres;
  gravier_proprete?: ReponseGravierProprete;
  gouttieres?: ReponseGouttieres;
  recuperateur_eau?: ReponseRecuperateurEau;
}

export type ReponseArbreProximite = "oui" | "non" | "ne_sais_pas";
export type ReponseArbreEssence = "tres_gourmand" | "grand_ornement" | "fruitier_petit" | "ne_sais_pas";
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
export type ReponseSourceChaleurSousSol = "oui_mur_isole" | "oui_mur_non_isole" | "non" | "pas_de_sous_sol";

export interface VulnerabiliteDiversReponses {
  mitoyennete?: ReponseMitoyennete;
  ensoleillement?: ReponseEnsoleillement;
  source_chaleur_sous_sol?: ReponseSourceChaleurSousSol;
}

/** Réponses collectées au fil du parcours, section par section (miroir de `PartialRGASimulationData`). */
export interface PartialVulnerabiliteReponses {
  adresse?: VulnerabiliteAdresseReponses;
  eaux?: VulnerabiliteEauxReponses;
  vegetation?: VulnerabiliteVegetationReponses;
  divers?: VulnerabiliteDiversReponses;
}
