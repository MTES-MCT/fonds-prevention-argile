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
export function getCodeDepartementFromCodeInsee(codeInsee: string): string {
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
