import type { CommuneSEO, DepartementSEO, EpciSEO } from "@/features/seo";

/**
 * Types pour les placeholders des templates
 */
export interface DepartementPlaceholders {
  nom_departement: string;
  code_departement: string;
}

export interface CommunePlaceholders extends DepartementPlaceholders {
  nom_commune: string;
  code_postal: string;
}

export interface EpciPlaceholders extends DepartementPlaceholders {
  nom_epci: string;
}

/**
 * Remplace les placeholders dans une chaîne de caractères
 */
export function hydratePlaceholders(template: string, placeholders: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(regex, value);
  }

  return result;
}

/**
 * Hydrate récursivement un objet JSON avec les placeholders
 */
export function hydrateTemplate<T extends Record<string, unknown>>(
  template: T,
  placeholders: Record<string, string>
): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(template)) {
    if (typeof value === "string") {
      result[key] = hydratePlaceholders(value, placeholders);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "string"
          ? hydratePlaceholders(item, placeholders)
          : typeof item === "object" && item !== null
            ? hydrateTemplate(item as Record<string, unknown>, placeholders)
            : item
      );
    } else if (typeof value === "object" && value !== null) {
      result[key] = hydrateTemplate(value as Record<string, unknown>, placeholders);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Crée les placeholders pour un département
 */
export function createDepartementPlaceholders(departement: DepartementSEO): DepartementPlaceholders {
  return {
    nom_departement: departement.nom,
    code_departement: departement.code,
  };
}

/**
 * Crée les placeholders pour une commune
 */
export function createCommunePlaceholders(commune: CommuneSEO, departement: DepartementSEO): CommunePlaceholders {
  return {
    nom_commune: commune.nom,
    code_postal: commune.codesPostaux[0] || commune.codeInsee,
    nom_departement: departement.nom,
    code_departement: departement.code,
  };
}

/**
 * Crée les placeholders pour un EPCI
 */
export function createEpciPlaceholders(epci: EpciSEO, departement: DepartementSEO): EpciPlaceholders {
  return {
    nom_epci: epci.nom,
    nom_departement: departement.nom,
    code_departement: departement.code,
  };
}
