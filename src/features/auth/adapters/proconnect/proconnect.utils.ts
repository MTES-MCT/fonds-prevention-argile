import type { ProConnectUserInfo } from "./proconnect.types";

/**
 * Valide le format d'un SIRET (14 chiffres)
 */
export function isValidSiret(siret: string): boolean {
  return /^\d{14}$/.test(siret);
}

/**
 * Valide les données ProConnect obligatoires
 * Note: uid et siret sont optionnels car les comptes de test
 * et certains agents n'ont pas d'organisation rattachée
 */
export function validateProConnectUserInfo(userInfo: Partial<ProConnectUserInfo>): userInfo is ProConnectUserInfo {
  const isValid = !!(userInfo.sub && userInfo.email && userInfo.given_name);
  return isValid;
}

/**
 * Nettoie les données ProConnect (trim, normalisation)
 */
export function sanitizeProConnectUserInfo(userInfo: ProConnectUserInfo): ProConnectUserInfo {
  return {
    ...userInfo,
    email: userInfo.email.toLowerCase().trim(),
    given_name: userInfo.given_name.trim(),
    usual_name: userInfo.usual_name?.trim(),
    siret: userInfo.siret?.replace(/\s/g, ""), // Enlever les espaces
    phone: userInfo.phone?.trim(),
    organizational_unit: userInfo.organizational_unit?.trim(),
  };
}
