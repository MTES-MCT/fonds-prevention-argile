import { RGAFormData } from "./types";

/**
 * Nettoie une clé de paramètre URL en préservant les accents puis normalise
 */
function cleanKey(key: string): string {
  return key
    .replace(/\s+/g, "_") // Remplacer espaces par underscores pour la lisibilité
    .replace(/[^\w\u00C0-\u017F\u0100-\u024F._]/g, "") // Préserver accents + lettres + chiffres + points + underscores
    .toLowerCase() // Normaliser en minuscules
    .normalize("NFD") // Décomposer les caractères accentués
    .replace(/[\u0300-\u036f]/g, ""); // Supprimer les accents
}

/**
 * Nettoie et convertit une valeur de paramètre URL
 */
function cleanAndConvertValue(value: string): string | number | boolean {
  // Décoder et nettoyer
  const cleaned = decodeURIComponent(value)
    .replace(/^["']|["']$/g, "") // Enlever guillemets simples/doubles début/fin
    .replace(/\\"/g, "") // Enlever guillemets échappés \"
    .replace(/"/g, "") // Enlever tous les guillemets restants
    .replace(/\*$/, "") // Enlever astérisque final
    .trim();

  // Convertir en types appropriés
  if (cleaned === "oui") return true;
  if (cleaned === "non") return false;

  // Essayer de convertir en nombre
  const asNumber = Number(cleaned);
  if (!isNaN(asNumber) && cleaned !== "") {
    return asNumber;
  }

  return cleaned;
}

/**
 * Type pour le résultat du parser
 */
export type ParsedRGAData = {
  logement?: Partial<RGAFormData["logement"]>;
  taxeFonciere?: Partial<RGAFormData["taxeFonciere"]>;
  rga?: Partial<RGAFormData["rga"]>;
  menage?: Partial<RGAFormData["menage"]>;
  vous?: Partial<RGAFormData["vous"]>;
};

/**
 * Parse et structure les paramètres RGA depuis l'URL
 */
export function parseRGAParams(searchParams: URLSearchParams): ParsedRGAData {
  const result: ParsedRGAData = {};

  for (const [key, value] of searchParams.entries()) {
    const cleanedKey = cleanKey(key);
    const cleanedValue = cleanAndConvertValue(value);

    // Diviser la clé par les points pour créer la structure
    const keyParts = cleanedKey.split(".");

    if (keyParts.length >= 2) {
      const section = keyParts[0];
      const property = keyParts.slice(1).join(".");

      // Router vers les bonnes sections
      switch (section) {
        case "logement":
          if (!result.logement) result.logement = {};
          (result.logement as Record<string, unknown>)[property] = cleanedValue;
          break;

        case "taxefonciere":
          if (!result.taxeFonciere) result.taxeFonciere = {};
          (result.taxeFonciere as Record<string, unknown>)[property] =
            cleanedValue;
          break;

        case "rga":
          if (!result.rga) result.rga = {};
          (result.rga as Record<string, unknown>)[property] = cleanedValue;
          break;

        case "menage":
          if (!result.menage) result.menage = {};
          (result.menage as Record<string, unknown>)[property] = cleanedValue;
          break;

        case "vous":
          if (!result.vous) result.vous = {};
          (result.vous as Record<string, unknown>)[property] = cleanedValue;
          break;

        default:
          // Section inconnue, on l'ignore ou on log
          console.warn(`Section RGA inconnue: ${section}`);
      }
    }
  }

  return result;
}
