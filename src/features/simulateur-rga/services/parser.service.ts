import type { PartialRGAFormData } from "../domain/entities/RGAFormData";

/**
 * Nettoie une clé de paramètre URL
 */
function cleanKey(key: string): string {
  return key
    .replace(/\s+/g, "_")
    .replace(/[^\w\u00C0-\u017F\u0100-\u024F._]/g, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Nettoie et convertit une valeur
 */
function cleanAndConvertValue(value: string): string | number | boolean {
  const cleaned = decodeURIComponent(value)
    .replace(/^["']|["']$/g, "")
    .replace(/\\"/g, "")
    .replace(/"/g, "")
    .replace(/\*$/, "")
    .trim();

  if (cleaned === "oui") return true;
  if (cleaned === "non") return false;

  const asNumber = Number(cleaned);
  if (!isNaN(asNumber) && cleaned !== "") {
    return asNumber;
  }

  return cleaned;
}

/**
 * Parse les paramètres RGA depuis l'URL
 */
export function parseRGAParams(
  searchParams: URLSearchParams
): PartialRGAFormData {
  const tempResult: {
    logement?: Record<string, unknown>;
    taxeFonciere?: Record<string, unknown>;
    rga?: Record<string, unknown>;
    menage?: Record<string, unknown>;
    vous?: Record<string, unknown>;
  } = {};

  for (const [key, value] of searchParams.entries()) {
    const cleanedKey = cleanKey(key);
    const cleanedValue = cleanAndConvertValue(value);

    const keyParts = cleanedKey.split(".");

    if (keyParts.length >= 2) {
      const section = keyParts[0];
      const property = keyParts.slice(1).join("_");

      switch (section) {
        case "logement":
          if (!tempResult.logement) tempResult.logement = {};
          tempResult.logement[property] = cleanedValue;
          break;

        case "taxe_fonciere":
          if (!tempResult.taxeFonciere) tempResult.taxeFonciere = {};
          tempResult.taxeFonciere[property] = cleanedValue;
          break;

        case "rga":
          if (!tempResult.rga) tempResult.rga = {};
          tempResult.rga[property] = cleanedValue;
          break;

        case "menage":
          if (!tempResult.menage) tempResult.menage = {};
          tempResult.menage[property] = cleanedValue;
          break;

        case "vous":
          if (!tempResult.vous) tempResult.vous = {};
          tempResult.vous[property] = cleanedValue;
          break;

        default:
          console.warn(`Section RGA inconnue: ${section}`);
      }
    }
  }

  return tempResult as PartialRGAFormData;
}
