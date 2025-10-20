/**
 * Types de retour pour les queries AMO
 */

/**
 * Paramètres pour la sélection d'un AMO
 */
export interface SelectAmoParams {
  entrepriseAmoId: string;
  userPrenom: string;
  userNom: string;
  adresseLogement: string;
}

/**
 * Résultat de la sélection d'un AMO
 */
export interface SelectAmoResult {
  message: string;
  token: string;
}

/**
 * Résultat d'une action de validation
 */
export interface ValidationActionResult {
  message: string;
}
