export interface FranceConnectTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token: string;
  scope: string;
}

export interface FranceConnectUserInfo {
  sub: string; // Identifiant unique FranceConnect
  given_name?: string; // Prénom
  family_name?: string; // Nom
  email?: string; // Email
  birthdate?: string; // Date de naissance (optionnel)
  gender?: string; // Genre (optionnel)
  birthplace?: string; // Lieu de naissance (optionnel)
  birthcountry?: string; // Pays de naissance (optionnel)
}

export interface FranceConnectError {
  error: string;
  error_description?: string;
}
