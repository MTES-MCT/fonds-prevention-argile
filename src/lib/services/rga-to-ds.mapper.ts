import type { RGAFormData } from "@/lib/form-rga/types";
import type { PrefillData } from "@/lib/api/demarches-simplifiees/rest/types";

/**
 * Mappe les données RGA vers le format de préremplissage DS
 *
 * Note: Les IDs des champs (champ_xxx) doivent correspondre
 * exactement aux IDs dans Démarches Simplifiées
 */
export function mapRGAToDSFormat(rgaData: Partial<RGAFormData>): PrefillData {
  const prefillData: PrefillData = {};

  // === SECTION LOGEMENT ===
  if (rgaData.logement) {
    const { logement } = rgaData;

    // Adresse complète
    if (logement.adresse) {
      prefillData["champ_Q2hhbXAtMzY4NjYwOQ"] = logement.adresse;
    }

    // Code postal et ville (à extraire de l'adresse ou utiliser commune_nom)
    if (logement.commune_nom) {
      prefillData["champ_Q2hhbXAtMzY4NjYxMA"] = logement.commune_nom;
    }

    // Type de logement
    if (logement.type) {
      prefillData["champ_Q2hhbXAtMzY4NjYxMQ"] =
        logement.type === "maison" ? "Maison individuelle" : "Appartement";
    }

    // Année de construction
    if (logement.annee_de_construction) {
      prefillData["champ_Q2hhbXAtMzY4NjYxMg"] = parseInt(
        logement.annee_de_construction
      );
    }

    // Nombre de niveaux
    if (logement.niveaux) {
      prefillData["champ_Q2hhbXAtMzY4NjYxMw"] = logement.niveaux;
    }

    // Zone d'exposition
    if (logement.zone_dexposition) {
      const zoneMapping: Record<string, string> = {
        faible: "Zone d'exposition faible",
        moyen: "Zone d'exposition moyenne",
        fort: "Zone d'exposition forte",
      };
      prefillData["champ_Q2hhbXAtMzY4NjYxNA"] =
        zoneMapping[logement.zone_dexposition];
    }

    // Propriétaire occupant
    if (logement.proprietaire_occupant !== undefined) {
      prefillData["champ_Q2hhbXAtMzY4NjYxNQ"] =
        logement.proprietaire_occupant === "oui" ? "true" : "false";
    }

    // Logement mitoyen
    if (logement.mitoyen !== undefined) {
      prefillData["champ_Q2hhbXAtMzY4NjYxNg"] =
        logement.mitoyen === "oui" ? "true" : "false";
    }

    // Référence cadastrale RNB
    if (logement.rnb) {
      prefillData["champ_Q2hhbXAtMzY4NjYxNw"] = logement.rnb;
    }

    // Coordonnées GPS
    if (logement.coordonnees) {
      prefillData["champ_Q2hhbXAtMzY4NjYxOA"] = logement.coordonnees;
    }
  }

  // === SECTION MÉNAGE ===
  if (rgaData.menage) {
    const { menage } = rgaData;

    // Nombre de personnes dans le foyer
    if (menage.personnes) {
      prefillData["champ_Q2hhbXAtMzY4NjYxOQ"] = menage.personnes;
    }

    // Revenu fiscal de référence
    if (menage.revenu) {
      prefillData["champ_Q2hhbXAtMzY4NjYyMA"] = menage.revenu;
    }
  }

  // === SECTION RGA (Assurance) ===
  if (rgaData.rga) {
    const { rga } = rgaData;

    // Assuré contre le RGA
    if (rga.assure !== undefined) {
      prefillData["champ_Q2hhbXAtMzY4NjYyMQ"] =
        rga.assure === "oui" ? "true" : "false";
    }

    // Déjà indemnisé pour RGA
    if (rga.indemnise_rga !== undefined) {
      prefillData["champ_Q2hhbXAtMzY4NjYyMg"] =
        rga.indemnise_rga === "oui" ? "true" : "false";
    }

    // Logement peu endommagé
    if (rga.peu_endommage !== undefined) {
      prefillData["champ_Q2hhbXAtMzY4NjYyMw"] =
        rga.peu_endommage === "oui" ? "true" : "false";
    }
  }

  // === SECTION PROPRIÉTAIRE ===
  if (rgaData.vous) {
    const { vous } = rgaData;

    // Conditions de propriété remplies
    if (vous.proprietaire_condition !== undefined) {
      prefillData["champ_Q2hhbXAtMzY4NjYyNA"] =
        vous.proprietaire_condition === "oui" ? "true" : "false";
    }

    // Propriétaire occupant RGA
    if (vous.proprietaire_occupant_rga !== undefined) {
      prefillData["champ_Q2hhbXAtMzY4NjYyNQ"] =
        vous.proprietaire_occupant_rga === "oui" ? "true" : "false";
    }
  }

  // === SECTION TAXE FONCIÈRE ===
  if (rgaData.taxeFonciere) {
    const { taxeFonciere } = rgaData;

    // Commune éligible
    if (taxeFonciere.commune_eligible !== undefined) {
      prefillData["champ_Q2hhbXAtMzY4NjYyNg"] =
        taxeFonciere.commune_eligible === "oui" ? "true" : "false";
    }
  }

  // === MÉTADONNÉES ===
  // Date de soumission du simulateur
  prefillData["champ_Q2hhbXAtMzY4NjYyNw"] = new Date()
    .toISOString()
    .split("T")[0];

  // Source de la demande
  prefillData["champ_Q2hhbXAtMzY4NjYyOA"] = "Simulateur RGA";

  return prefillData;
}

/**
 * Valide que toutes les données requises sont présentes
 */
export function validateRGADataForDS(rgaData: Partial<RGAFormData>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Vérifications requises pour DS
  if (!rgaData.logement?.adresse) {
    errors.push("L'adresse du logement est requise");
  }

  if (!rgaData.menage?.revenu) {
    errors.push("Le revenu fiscal de référence est requis");
  }

  if (!rgaData.menage?.personnes) {
    errors.push("Le nombre de personnes dans le foyer est requis");
  }

  if (!rgaData.logement?.type) {
    errors.push("Le type de logement est requis");
  }

  if (!rgaData.logement?.zone_dexposition) {
    errors.push("La zone d'exposition est requise");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Récupère un résumé des données pour affichage
 */
export function getRGADataSummary(rgaData: Partial<RGAFormData>): string {
  const summary: string[] = [];

  if (rgaData.logement?.adresse) {
    summary.push(`Adresse: ${rgaData.logement.adresse}`);
  }

  if (rgaData.logement?.type) {
    summary.push(`Type: ${rgaData.logement.type}`);
  }

  if (rgaData.menage?.personnes && rgaData.menage?.revenu) {
    summary.push(
      `Foyer: ${rgaData.menage.personnes} personne(s), ${rgaData.menage.revenu}€ de revenu`
    );
  }

  return summary.join(" | ");
}
