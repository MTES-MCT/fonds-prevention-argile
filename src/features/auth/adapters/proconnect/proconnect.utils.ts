import type { ProConnectUserInfo } from "./proconnect.types";

/**
 * Valide le format d'un SIRET (14 chiffres)
 */
export function isValidSiret(siret: string): boolean {
  return /^\d{14}$/.test(siret);
}

/**
 * Valide les données ProConnect obligatoires
 */
export function validateProConnectUserInfo(userInfo: Partial<ProConnectUserInfo>): userInfo is ProConnectUserInfo {
  return !!(
    userInfo.sub &&
    userInfo.email &&
    userInfo.given_name &&
    userInfo.usual_name &&
    userInfo.uid &&
    userInfo.siret
  );
}

/**
 * Nettoie les données ProConnect (trim, normalisation)
 */
export function sanitizeProConnectUserInfo(userInfo: ProConnectUserInfo): ProConnectUserInfo {
  return {
    ...userInfo,
    email: userInfo.email.toLowerCase().trim(),
    given_name: userInfo.given_name.trim(),
    usual_name: userInfo.usual_name.trim(),
    siret: userInfo.siret.replace(/\s/g, ""), // Enlever les espaces
    phone: userInfo.phone?.trim(),
    organizational_unit: userInfo.organizational_unit?.trim(),
  };
}
