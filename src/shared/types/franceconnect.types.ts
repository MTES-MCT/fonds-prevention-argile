/**
 * Types pour l'intégration FranceConnect
 */

// Réponse du endpoint token de FranceConnect
export interface FranceConnectTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token: string;
  refresh_token?: string;
}

// Informations utilisateur retournées par FranceConnect
export interface FranceConnectUserInfo {
  sub: string; // Identifiant unique de l'utilisateur (obligatoire)
  given_name?: string; // Prénom
  family_name?: string; // Nom de famille
  email?: string; // Adresse email
  birthdate?: string; // Date de naissance (format YYYY-MM-DD)
  gender?: string; // Genre (male/female)
  birthplace?: string; // Code INSEE du lieu de naissance
  birthcountry?: string; // Code INSEE du pays de naissance
}

// Erreur retournée par FranceConnect
export interface FranceConnectError {
  error: string;
  error_description?: string;
  error_uri?: string;
  state?: string;
}
