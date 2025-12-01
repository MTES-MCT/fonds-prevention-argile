/**
 * Types pour l'intégration ProConnect
 * Basés sur la spécification OpenID Connect pour agents publics
 */

/**
 * Réponse du endpoint /token
 */
export interface ProConnectTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  id_token: string;
  scope: string;
  refresh_token?: string;
}

/**
 * Informations utilisateur ProConnect (userinfo)
 * Données obligatoires renvoyées par tous les Fournisseurs d'Identité
 */
export interface ProConnectUserInfo {
  sub: string; // Identifiant unique technique
  email: string; // Email (obligatoire)
  given_name: string; // Prénom(s)
  usual_name?: string; // Nom de famille d'usage

  // Champs liés à l'organisation (optionnels selon le FI)
  uid?: string; // Identifiant unique du FI
  siret?: string;

  // Champs optionnels (selon le FI)
  phone?: string;
  organizational_unit?: string;
  belonging_population?: string;
  idp_id?: string;
  idp_acr?: string;

  // Claims OpenID Connect standards
  aud?: string;
  exp?: number;
  iat?: number;
  iss?: string;
}

/**
 * Contenu décodé de l'id_token ProConnect
 */
export interface ProConnectIdToken {
  aud: string; // client_id
  exp: number; // Date d'expiration
  iat: number; // Date de création
  iss: string; // Émetteur (ProConnect)
  sub: string; // Identifiant unique
  nonce: string; // Nonce de sécurité
  idp?: string; // Fournisseur d'identité utilisé
}

/**
 * Structure d'erreur ProConnect
 */
export interface ProConnectError {
  error: string;
  error_description?: string;
  error_uri?: string;
}

/**
 * Paramètres pour la génération de l'URL d'autorisation
 */
export interface ProConnectAuthParams {
  response_type: "code";
  client_id: string;
  redirect_uri: string;
  scope: string;
  state: string;
  nonce: string;
  acr_values: string;
}

/**
 * Résultat du callback ProConnect
 */
export interface ProConnectCallbackResult {
  success: boolean;
  error?: string;
  shouldLogout?: boolean;
}
