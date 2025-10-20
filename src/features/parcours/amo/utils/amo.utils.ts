/**
 * Extrait le code département depuis un code INSEE (2 premiers chiffres)
 * Gère les cas spéciaux (Corse 2A/2B, DOM-TOM)
 */
export function getCodeDepartementFromCodeInsee(codeInsee: string): string {
  if (!codeInsee || codeInsee.length < 2) {
    return "";
  }

  // Cas spéciaux Corse
  if (codeInsee.startsWith("2A") || codeInsee.startsWith("2B")) {
    return codeInsee.substring(0, 2);
  }

  // Cas DOM-TOM (codes à 3 chiffres commençant par 97 ou 98)
  if (codeInsee.startsWith("97") || codeInsee.startsWith("98")) {
    return codeInsee.substring(0, 3);
  }

  // Cas général : 2 premiers chiffres
  return codeInsee.substring(0, 2);
}
