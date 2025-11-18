import type { PartialRGAFormData, RGAFormData } from "../domain/entities";
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
      commune_denormandie: rgaData.logement.commune_denormandie,
      annee_de_construction: rgaData.logement.annee_de_construction,
      rnb: rgaData.logement.rnb,
      niveaux: rgaData.logement.niveaux,
      zone_dexposition: rgaData.logement.zone_dexposition,
      type: rgaData.logement.type,
      mitoyen: rgaData.logement.mitoyen,
      proprietaire_occupant: rgaData.logement.proprietaire_occupant,
    },

    taxeFonciere: {
      commune_eligible: rgaData.taxeFonciere.commune_eligible,
    },

    rga: {
      assure: rgaData.rga.assure,
      indemnise_indemnise_rga: rgaData.rga.indemnise_indemnise_rga,
      indemnise_montant_indemnite: rgaData.rga.indemnise_montant_indemnite,
      sinistres: rgaData.rga.sinistres,
    },

    menage: {
      revenu_rga: rgaData.menage.revenu_rga,
      personnes: rgaData.menage.personnes,
    },

    vous: {
      proprietaire_condition: rgaData.vous.proprietaire_condition,
      proprietaire_occupant_rga: rgaData.vous.proprietaire_occupant_rga,
    },

    simulatedAt: new Date().toISOString(),
  };
}

/**
 * Convertit les données RGA depuis le format BDD vers le format iframe
 * (Inverse de mapRGAFormDataToDBSchema)
 */
export function mapDBToRGAFormData(
  dbData: RGASimulationData
): PartialRGAFormData {
  return {
    logement: {
      adresse: dbData.logement.adresse,
      code_region: dbData.logement.code_region,
      code_departement: dbData.logement.code_departement,
      epci: dbData.logement.epci,
      commune: dbData.logement.commune,
      commune_nom: dbData.logement.commune_nom,
      coordonnees: dbData.logement.coordonnees,
      clef_ban: dbData.logement.clef_ban,
      commune_denormandie: dbData.logement.commune_denormandie,
      annee_de_construction: dbData.logement.annee_de_construction,
      rnb: dbData.logement.rnb,
      niveaux: dbData.logement.niveaux,
      zone_dexposition: dbData.logement.zone_dexposition,
      type: dbData.logement.type,
      mitoyen: dbData.logement.mitoyen,
      proprietaire_occupant: dbData.logement.proprietaire_occupant,
    },
    taxeFonciere: {
      commune_eligible: dbData.taxeFonciere.commune_eligible,
    },
    rga: {
      assure: dbData.rga.assure,
      indemnise_indemnise_rga: dbData.rga.indemnise_indemnise_rga,
      sinistres: dbData.rga.sinistres,
      indemnise_montant_indemnite: dbData.rga.indemnise_montant_indemnite,
    },
    menage: {
      revenu_rga: dbData.menage.revenu_rga,
      personnes: dbData.menage.personnes,
    },
    vous: {
      proprietaire_condition: dbData.vous.proprietaire_condition,
      proprietaire_occupant_rga: dbData.vous.proprietaire_occupant_rga,
    },
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
  //  Vérifier que mitoyen existe
  if (
    rgaData.logement?.mitoyen === undefined ||
    rgaData.logement?.mitoyen === null
  ) {
    errors.push("Information de mitoyenneté manquante");
  }
  //  Vérifier que assure existe
  if (rgaData.rga?.assure === undefined || rgaData.rga?.assure === null) {
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
