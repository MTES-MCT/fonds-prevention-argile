import type { SlugOptions } from "../domain/types";

/**
 * Table de correspondance pour les caractères accentués
 */
const ACCENTS_MAP: Record<string, string> = {
  à: "a",
  â: "a",
  ä: "a",
  á: "a",
  ã: "a",
  å: "a",
  æ: "ae",
  ç: "c",
  è: "e",
  é: "e",
  ê: "e",
  ë: "e",
  ì: "i",
  í: "i",
  î: "i",
  ï: "i",
  ñ: "n",
  ò: "o",
  ó: "o",
  ô: "o",
  ö: "o",
  õ: "o",
  ø: "o",
  œ: "oe",
  ù: "u",
  ú: "u",
  û: "u",
  ü: "u",
  ý: "y",
  ÿ: "y",
  À: "a",
  Â: "a",
  Ä: "a",
  Á: "a",
  Ã: "a",
  Å: "a",
  Æ: "ae",
  Ç: "c",
  È: "e",
  É: "e",
  Ê: "e",
  Ë: "e",
  Ì: "i",
  Í: "i",
  Î: "i",
  Ï: "i",
  Ñ: "n",
  Ò: "o",
  Ó: "o",
  Ô: "o",
  Ö: "o",
  Õ: "o",
  Ø: "o",
  Œ: "oe",
  Ù: "u",
  Ú: "u",
  Û: "u",
  Ü: "u",
  Ý: "y",
  Ÿ: "y",
};

/**
 * Supprime les accents d'une chaîne de caractères
 */
function removeAccents(str: string): string {
  return str
    .split("")
    .map((char) => ACCENTS_MAP[char] || char)
    .join("");
}

/**
 * Génère un slug URL-friendly à partir d'un nom
 *
 * @param name - Nom à transformer en slug
 * @param options - Options de génération
 * @returns Slug URL-friendly
 *
 * @example
 * generateSlug("Montluçon") // "montlucon"
 * generateSlug("Montluçon", { suffix: "03185" }) // "montlucon-03185"
 * generateSlug("Saint-Étienne-du-Rouvray", { suffix: "76116" }) // "saint-etienne-du-rouvray-76116"
 */
export function generateSlug(name: string, options?: SlugOptions): string {
  const { suffix, separator = "-" } = options || {};

  // 1. Convertir en minuscules
  let slug = name.toLowerCase();

  // 2. Supprimer les accents
  slug = removeAccents(slug);

  // 3. Remplacer les apostrophes et caractères spéciaux par des espaces
  slug = slug.replace(/[']/g, " ");

  // 4. Remplacer tout ce qui n'est pas alphanumérique par des tirets
  slug = slug.replace(/[^a-z0-9]+/g, "-");

  // 5. Supprimer les tirets en début et fin
  slug = slug.replace(/^-+|-+$/g, "");

  // 6. Supprimer les tirets multiples
  slug = slug.replace(/-+/g, "-");

  // 7. Ajouter le suffixe si présent
  if (suffix) {
    slug = `${slug}${separator}${suffix}`;
  }

  return slug;
}

/**
 * Génère un slug pour un département
 * Format: nom-du-departement (ex: "alpes-de-haute-provence")
 */
export function generateDepartementSlug(nom: string): string {
  return generateSlug(nom);
}

/**
 * Génère un slug pour une commune
 * Format: nom-commune-codeinsee (ex: "montlucon-03185")
 */
export function generateCommuneSlug(nom: string, codeInsee: string): string {
  return generateSlug(nom, { suffix: codeInsee });
}

/**
 * Génère un slug pour un EPCI
 * Format: nom-epci-codesiren (ex: "ca-montlucon-communaute-200071082")
 */
export function generateEpciSlug(nom: string, codeSiren: string): string {
  return generateSlug(nom, { suffix: codeSiren });
}
