/**
 * Utilitaires pour les AMO
 */

/**
 * Extrait le code département depuis un code INSEE
 * @param codeInsee Code INSEE à 5 chiffres
 * @returns Code département (2 ou 3 premiers chiffres)
 *
 * @example
 * getCodeDepartementFromCodeInsee("75001") // "75"
 * getCodeDepartementFromCodeInsee("97411") // "974" (Réunion)
 */
export function getCodeDepartementFromCodeInsee(
  codeInsee: string | null | undefined
): string {
  if (!codeInsee || codeInsee.length !== 5) {
    throw new Error("Code INSEE invalide : doit contenir 5 chiffres");
  }

  // Départements d'outre-mer (3 chiffres)
  if (codeInsee.startsWith("97") || codeInsee.startsWith("98")) {
    return codeInsee.substring(0, 3);
  }

  // Départements métropolitains (2 chiffres)
  return codeInsee.substring(0, 2);
}

/**
 * Valide un code SIRET
 */
export function isValidSiret(siret: string): boolean {
  const cleaned = siret.replace(/\s/g, "");
  return /^\d{14}$/.test(cleaned);
}

/**
 * Valide une liste d'emails séparés par ";"
 */
export function validateEmailsList(emails: string): string[] {
  return emails
    .split(";")
    .map((e) => e.trim())
    .filter((e) => e.includes("@") && e.includes("."));
}

/**
 * Normalise un code INSEE en string de 5 chiffres
 * Gère les cas où le code INSEE est stocké en number et perd les zéros initiaux
 *
 * @param commune Code INSEE (string ou number)
 * @returns Code INSEE normalisé en string de 5 chiffres, ou null si invalide
 *
 * @example
 * normalizeCodeInsee(36202) // "36202"
 * normalizeCodeInsee(1234) // "01234"
 * normalizeCodeInsee("75001") // "75001"
 * normalizeCodeInsee(null) // null
 */
export function normalizeCodeInsee(
  commune: string | number | null | undefined
): string | null {
  if (commune === null || commune === undefined) {
    return null;
  }

  // Convertir en string et trimmer
  const communeStr = String(commune).trim();

  // Si vide après trim, retourner null
  if (communeStr === "") {
    return null;
  }

  const codeInseeStr = communeStr.padStart(5, "0");

  // Validation : doit être exactement 5 chiffres
  if (!/^\d{5}$/.test(codeInseeStr)) {
    return null;
  }

  return codeInseeStr;
}
