/**
 * Mappe les données RGA vers le format de préremplissage DS
 * Utilise les constantes centralisées pour le mapping
 */

import { PrefillData } from "../adapters/rest";
import { getMappableFields, getValueByPath } from "../utils";
import { DSField } from "../domain";
import { PartialRGASimulationData } from "@/features/simulateur";

/**
 * Mappe les données RGA vers le format de préremplissage DS
 * Utilise les constantes centralisées pour le mapping
 */
export function mapRGAToDSFormat(rgaData: PartialRGASimulationData): PrefillData {
  const prefillData: PrefillData = {};

  // Récupérer uniquement les champs qui ont un mapping RGA
  const mappableFields = getMappableFields();

  // Pour chaque champ mappable, extraire la valeur depuis RGA et l'ajouter au prefill
  mappableFields.forEach((field: DSField) => {
    if (!field.rgaPath) return;

    // Récupérer la valeur depuis l'objet RGA en utilisant le chemin
    const value = getValueByPath(rgaData as Record<string, unknown>, field.rgaPath);

    // Si la valeur existe
    if (value !== undefined && value !== null && value !== "") {
      // Appliquer la transformation si elle existe
      const transformedValue = field.transformer ? field.transformer(value, rgaData as Record<string, unknown>) : value;

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
export function validateRGADataForDS(rgaData: PartialRGASimulationData): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Définir les champs requis (ceux qui doivent absolument être remplis)
  const requiredFieldPaths: Array<{ path: string; label: string }> = [
    { path: "logement.adresse", label: "L'adresse du logement" },
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
    { path: "rga.sinistres", label: "L'état de la maison" },
    { path: "rga.indemnise_indemnise_rga", label: "L'indemnisation RGA" },

    { path: "menage.revenu_rga", label: "Le revenu fiscal de référence" },
    { path: "menage.personnes", label: "Le nombre de personnes dans le foyer" },
  ];

  // Vérifier les champs requis
  requiredFieldPaths.forEach(({ path, label }) => {
    const value = getValueByPath(rgaData as Record<string, unknown>, path);
    if (value === undefined || value === null || value === "") {
      errors.push(`${label} est requis`);
    }
  });

  // TODO : Ajouter des warnings pour les champs optionnels mais recommandés
  const optionalFieldPaths: Array<{ path: string; label: string }> = [];

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
