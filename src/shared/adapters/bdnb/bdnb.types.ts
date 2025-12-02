/**
 * Types pour l'API BDNB (Base de Données Nationale des Bâtiments)
 * Documentation : https://bdnb.io/
 */

/**
 * Réponse de l'endpoint batiment_construction
 * Permet de faire la correspondance RNB -> batiment_groupe_id
 */
export interface BdnbBatimentConstruction {
  batiment_groupe_id: string;
  rnb_id: string;
  batiment_construction_id?: string;
}

/**
 * Niveaux d'aléa argile possibles
 */
export type BdnbAleaArgile = "Fort" | "Moyen" | "Faible" | null;

/**
 * Réponse de l'endpoint batiment_groupe_complet
 * Données complètes d'un bâtiment
 */
export interface BdnbBatimentGroupeComplet {
  batiment_groupe_id: string;

  // Aléa argiles (RGA)
  alea_argiles?: BdnbAleaArgile;

  // Caractéristiques du bâtiment
  annee_construction?: number;
  nb_niveau?: number;
  surface_habitable?: number;
  hauteur_mean?: number;

  // Adresse
  libelle_adr_principale_ban?: string;
  code_postal?: string;
  libelle_commune?: string;
  code_departement?: string;

  // DPE
  dpe_etiquette_energie?: string;
  dpe_etiquette_ges?: string;

  // Autres données potentiellement utiles
  usage_niveau_1?: string;
  mat_mur_txt?: string;
  mat_toit_txt?: string;
}

/**
 * Erreur API BDNB
 */
export interface BdnbApiError {
  message: string;
  code?: string;
  hint?: string;
}
