// services/rga-to-ds.mapper.ts

import type { RGAFormData } from "@/lib/form-rga/types";
import type { PrefillData } from "@/lib/api/demarches-simplifiees/rest/types";
import {
  getMappableFields,
  getValueByPath,
  type DSField,
} from "@/lib/constants/dsFields.constants";

/**
 * Mappe les données RGA vers le format de préremplissage DS
 * Utilise les constantes centralisées pour le mapping
 */
/**
 * Mappe les données RGA vers le format de préremplissage DS
 * Utilise les constantes centralisées pour le mapping
 */
export function mapRGAToDSFormat(rgaData: Partial<RGAFormData>): PrefillData {
  const prefillData: PrefillData = {};

  // Récupérer uniquement les champs qui ont un mapping RGA
  const mappableFields = getMappableFields();

  // Pour chaque champ mappable, extraire la valeur depuis RGA et l'ajouter au prefill
  mappableFields.forEach((field: DSField) => {
    if (!field.rgaPath) return;

    // Récupérer la valeur depuis l'objet RGA en utilisant le chemin
    const value = getValueByPath(
      rgaData as Record<string, unknown>,
      field.rgaPath
    );

    // Si la valeur existe
    if (value !== undefined && value !== null && value !== "") {
      // Appliquer la transformation si elle existe
      const transformedValue = field.transformer
        ? field.transformer(value, rgaData as Record<string, unknown>)
        : value;

      // S'assurer que la valeur transformée est du bon type
      if (
        typeof transformedValue === "string" ||
        typeof transformedValue === "number" ||
        typeof transformedValue === "boolean" ||
        Array.isArray(transformedValue)
      ) {
        // Ajouter au prefill avec le préfixe "champ_"
        prefillData[`champ_${field.id}`] = transformedValue;
      } else if (transformedValue !== null) {
        // Si ce n'est pas un type valide, essayer de convertir en string
        prefillData[`champ_${field.id}`] = String(transformedValue);
      }
    }
  });

  // === DONNÉES SUPPLÉMENTAIRES NON MAPPÉES ===
  // Données RGA n'ont pas de correspondance directe dans le formulaire DS :
  // - logement.code_region
  // - logement.code_departement
  // - logement.epci
  // - logement.commune
  // - logement.commune_nom
  // - logement.coordonnees
  // - logement.clef_ban
  // - logement.commune_denormandie
  // - logement.rnb
  // - logement.type (maison/appartement - DS suppose toujours une maison...)
  // - taxeFonciere.commune_eligible
  // - vous.proprietaire_condition
  // - vous.proprietaire_occupant_rga

  return prefillData;
}

/**
 * Valide que toutes les données requises sont présentes
 */
export function validateRGADataForDS(rgaData: Partial<RGAFormData>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Définir les champs requis (ceux qui doivent absolument être remplis)
  const requiredFieldPaths: Array<{ path: string; label: string }> = [
    { path: "logement.adresse", label: "L'adresse du logement" },
    { path: "menage.revenu", label: "Le revenu fiscal de référence" },
    { path: "menage.personnes", label: "Le nombre de personnes dans le foyer" },
    {
      path: "logement.annee_de_construction",
      label: "L'année de construction",
    },
    { path: "logement.zone_dexposition", label: "La zone d'exposition" },
    {
      path: "logement.proprietaire_occupant",
      label: "Le statut de propriétaire occupant",
    },
    { path: "logement.mitoyen", label: "L'information de mitoyenneté" },
    { path: "logement.niveaux", label: "Le nombre de niveaux" },
    { path: "rga.assure", label: "Le statut d'assurance" },
  ];

  // Vérifier les champs requis
  requiredFieldPaths.forEach(({ path, label }) => {
    const value = getValueByPath(rgaData as Record<string, unknown>, path);
    if (value === undefined || value === null || value === "") {
      errors.push(`${label} est requis`);
    }
  });

  // Ajouter des warnings pour les champs optionnels mais recommandés
  const optionalFieldPaths: Array<{ path: string; label: string }> = [
    {
      path: "rga.peu_endommage",
      label: "Information sur les sinistres précoces",
    },
    {
      path: "rga.indemnise_rga",
      label: "Information sur l'indemnisation précédente",
    },
  ];

  optionalFieldPaths.forEach(({ path, label }) => {
    const value = getValueByPath(rgaData as Record<string, unknown>, path);
    if (value === undefined || value === null || value === "") {
      warnings.push(`${label} non renseigné (recommandé)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Récupère un résumé des données pour affichage
 */
export function getRGADataSummary(rgaData: Partial<RGAFormData>): string {
  const summary: string[] = [];

  if (rgaData.logement?.adresse) {
    summary.push(`📍 ${rgaData.logement.adresse}`);
  }

  if (rgaData.logement?.zone_dexposition) {
    const zoneLabel =
      {
        faible: "Zone faible",
        moyen: "Zone moyenne",
        fort: "Zone forte",
      }[rgaData.logement.zone_dexposition] || rgaData.logement.zone_dexposition;
    summary.push(`⚠️ ${zoneLabel}`);
  }

  if (rgaData.menage?.personnes && rgaData.menage?.revenu) {
    summary.push(
      `👥 ${rgaData.menage.personnes} pers. | 💰 ${new Intl.NumberFormat(
        "fr-FR",
        {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }
      ).format(rgaData.menage.revenu)}`
    );
  }

  if (rgaData.logement?.annee_de_construction) {
    summary.push(`🏠 Construite en ${rgaData.logement.annee_de_construction}`);
  }

  if (rgaData.rga?.assure !== undefined) {
    summary.push(
      rgaData.rga.assure === "oui" ? "✅ Assurée" : "❌ Non assurée"
    );
  }

  return summary.join(" | ");
}

/**
 * Récupère les statistiques de complétion du mapping
 */
export function getMappingStats(rgaData: Partial<RGAFormData>): {
  total: number;
  filled: number;
  percentage: number;
  bySection: Record<string, { total: number; filled: number }>;
} {
  const mappableFields = getMappableFields();
  let filled = 0;
  const bySection: Record<string, { total: number; filled: number }> = {};

  mappableFields.forEach((field) => {
    if (!field.rgaPath) return;

    // Initialiser la section si nécessaire
    if (!bySection[field.section]) {
      bySection[field.section] = { total: 0, filled: 0 };
    }
    bySection[field.section].total++;

    // Vérifier si la valeur existe
    const value = getValueByPath(
      rgaData as Record<string, unknown>,
      field.rgaPath
    );
    if (value !== undefined && value !== null && value !== "") {
      filled++;
      bySection[field.section].filled++;
    }
  });

  return {
    total: mappableFields.length,
    filled,
    percentage:
      mappableFields.length > 0
        ? Math.round((filled / mappableFields.length) * 100)
        : 0,
    bySection,
  };
}
