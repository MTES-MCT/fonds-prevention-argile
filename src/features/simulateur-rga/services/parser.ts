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
 * Parse et structure les paramètres RGA depuis l'URL
 * Retourne un objet Partial<RGAFormData>
 */
export function parseRGAParams(
  searchParams: URLSearchParams
): Partial<RGAFormData> {
  // Créer un objet temporaire avec des objets partiels pour chaque section
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

    // Diviser la clé par les points pour créer la structure
    const keyParts = cleanedKey.split(".");

    if (keyParts.length >= 2) {
      const section = keyParts[0];
      // Rejoindre avec des underscores pour éviter les points dans les propriétés
      const property = keyParts.slice(1).join("_");

      // Router vers les bonnes sections
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

  return tempResult as Partial<RGAFormData>;
}
