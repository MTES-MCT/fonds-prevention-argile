import type { RGAFormData } from "../domain/entities";
import type { RGASimulationData } from "../domain/types";

/**
 * Convertit les données du formulaire RGA (iframe) vers le format DB (JSONB)
 * Principale transformation : "oui"/"non" → boolean
 */
export function mapRGAFormDataToDBSchema(
  rgaData: RGAFormData
): RGASimulationData {
  return {
    logement: {
      adresse: rgaData.logement.adresse,
      code_region: rgaData.logement.code_region,
      code_departement: rgaData.logement.code_departement,
      epci: rgaData.logement.epci,
      commune: rgaData.logement.commune,
      commune_nom: rgaData.logement.commune_nom,
      coordonnees: rgaData.logement.coordonnees,
      clef_ban: rgaData.logement.clef_ban,
      commune_denormandie: rgaData.logement.commune_denormandie === "oui",
      annee_de_construction: rgaData.logement.annee_de_construction,
      rnb: rgaData.logement.rnb,
      niveaux: rgaData.logement.niveaux,
      zone_dexposition: rgaData.logement.zone_dexposition,
      type: rgaData.logement.type,
      mitoyen: rgaData.logement.mitoyen === "oui",
      proprietaire_occupant: rgaData.logement.proprietaire_occupant === "oui",
    },

    taxeFonciere: {
      commune_eligible: rgaData.taxeFonciere.commune_eligible === "oui",
    },

    rga: {
      assure: rgaData.rga.assure === "oui",
      indemnise_indemnise_rga: rgaData.rga.indemnise_indemnise_rga === "oui",
      sinistres: rgaData.rga.sinistres,
    },

    menage: {
      revenu_rga: rgaData.menage.revenu_rga,
      personnes: rgaData.menage.personnes,
    },

    vous: {
      proprietaire_condition:
        rgaData.vous.proprietaire_condition === "oui" || undefined,
      proprietaire_occupant_rga:
        rgaData.vous.proprietaire_occupant_rga === "oui" || undefined,
    },

    simulatedAt: new Date().toISOString(),
  };
}

/**
 * Valide que les données RGA sont complètes avant mapping
 */
export function validateRGADataForMapping(rgaData: RGAFormData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Vérifications obligatoires
  if (!rgaData.logement?.commune) {
    errors.push("Code INSEE manquant");
  }
  if (!rgaData.logement?.adresse) {
    errors.push("Adresse manquante");
  }
  if (!rgaData.logement?.zone_dexposition) {
    errors.push("Zone d'exposition manquante");
  }
  if (!rgaData.logement?.type) {
    errors.push("Type de logement manquant");
  }
  if (!rgaData.logement?.mitoyen) {
    errors.push("Information de mitoyenneté manquante");
  }
  if (!rgaData.rga?.assure) {
    errors.push("Information d'assurance manquante");
  }
  if (!rgaData.rga?.sinistres) {
    errors.push("État des sinistres manquant");
  }
  if (
    rgaData.menage?.revenu_rga === undefined ||
    rgaData.menage?.revenu_rga === null
  ) {
    errors.push("Revenu du ménage manquant");
  }
  if (
    rgaData.menage?.personnes === undefined ||
    rgaData.menage?.personnes === null
  ) {
    errors.push("Nombre de personnes manquant");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
