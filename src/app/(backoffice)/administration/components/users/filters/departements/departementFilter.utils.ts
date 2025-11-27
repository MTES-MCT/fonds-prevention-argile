import { UserWithParcoursDetails } from "@/features/backoffice";

/**
 * Constante représentant l'absence de département
 */
export const AUCUN_DEPARTEMENT = "__AUCUN__";

/**
 * Extrait le département d'un utilisateur avec fallback
 */
export function extractDepartement(user: UserWithParcoursDetails): string | null {
  // Source 1 : rgaSimulation (préféré, donnée structurée fiable)
  const departement = user.rgaSimulation?.logement?.departement;
  if (departement) {
    // Convertir en string si c'est un nombre
    return String(departement);
  }

  // Source 2 : Essayer d'extraire depuis adresse_logement
  const adresseLogement = user.amoValidation?.userData?.adresseLogement;
  if (adresseLogement) {
    // Pattern 1 : Chercher un département entre parenthèses : "Commune (81)"
    const matchParentheses = adresseLogement.match(/\((\d{2,3}[AB]?)\)/);
    if (matchParentheses) return matchParentheses[1];

    // Pattern 2 : Chercher un code postal (5 chiffres) et extraire les 2-3 premiers
    // Format: "547 ROUTE DE LA SERRE 81470 Montgey"
    const matchCodePostal = adresseLogement.match(/\b(\d{5})\b/);
    if (matchCodePostal) {
      const codePostal = matchCodePostal[1];
      // DOM-TOM : codes postaux 971xx, 972xx, etc. → départements 971, 972
      if (codePostal.startsWith("97") || codePostal.startsWith("98")) {
        return codePostal.substring(0, 3);
      }
      // Corse : 20xxx → peut être 2A ou 2B (on ne peut pas deviner, on retourne "20")
      if (codePostal.startsWith("20")) {
        return "20"; // Limitation : on ne peut pas distinguer 2A/2B sans données structurées
      }
      // France métropolitaine : 2 premiers chiffres
      return codePostal.substring(0, 2);
    }

    // Pattern 3 : En dernier recours, chercher 2-3 chiffres qui ne sont pas en début de chaîne
    // (pour éviter les numéros de rue)
    const words = adresseLogement.split(" ");
    for (let i = words.length - 1; i >= 0; i--) {
      const word = words[i];
      if (/^\d{2,3}[AB]?$/.test(word) && i > 0) {
        // Trouvé un nombre de 2-3 chiffres qui n'est pas le premier mot
        return word;
      }
    }
  }

  return null;
}

/**
 * Normalise un code département (enlève les 0 initiaux, gère les cas spéciaux)
 */
export function normalizeDepartement(dept: string | number): string {
  // Convertir en string si c'est un nombre
  const deptStr = String(dept);

  // Enlever les zéros initiaux : "081" → "81"
  const normalized = deptStr.replace(/^0+/, "");

  // Garder les cas spéciaux
  if (normalized === "") return "0"; // Edge case
  return normalized;
}

/**
 * Extrait tous les départements uniques d'une liste d'utilisateurs
 */
export function extractUniqueDepartements(users: UserWithParcoursDetails[]): string[] {
  return Array.from(
    new Set(
      users
        .map((u) => {
          const dept = extractDepartement(u);
          return dept ? normalizeDepartement(dept) : null;
        })
        .filter((dept): dept is string => dept !== null && dept !== "")
    )
  ).sort((a, b) => {
    // Tri numérique intelligent
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });
}

/**
 * Filtre les utilisateurs par département
 */
export function filterUsersByDepartement(
  users: UserWithParcoursDetails[],
  departementCode: string
): UserWithParcoursDetails[] {
  // Cas des users sans département
  if (departementCode === AUCUN_DEPARTEMENT) {
    return users.filter((u) => extractDepartement(u) === null);
  }

  return users.filter((u) => {
    const dept = extractDepartement(u);
    return dept ? normalizeDepartement(dept) === departementCode : false;
  });
}

/**
 * Compte le nombre d'utilisateurs par département
 */
export function countUsersByDepartement(users: UserWithParcoursDetails[], departementCode: string): number {
  return filterUsersByDepartement(users, departementCode).length;
}

/**
 * Compte les utilisateurs sans département
 */
export function countUsersWithoutDepartement(users: UserWithParcoursDetails[]): number {
  return users.filter((u) => extractDepartement(u) === null).length;
}
