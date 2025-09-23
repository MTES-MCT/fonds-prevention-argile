import type { RGAFormData } from "@/lib/form-rga/types";
import type { PrefillData } from "@/lib/api/demarches-simplifiees/rest/types";

/**
 * Mappe les données RGA vers le format de préremplissage DS
 * IDs mis à jour selon le schéma DS réel
 */
export function mapRGAToDSFormat(rgaData: Partial<RGAFormData>): PrefillData {
  const prefillData: PrefillData = {};

  // === SECTION 1: IDENTIFICATION DU DEMANDEUR ===

  // Note: Adresse de correspondance, téléphone et email du demandeur
  // ne sont pas dans RGA - ils devront être saisis manuellement dans DS

  // Nombre de personnes composant le ménage
  if (rgaData.menage?.personnes) {
    prefillData["champ_Q2hhbXAtNTQyMjU4NA"] = rgaData.menage.personnes;
  }

  // Revenu fiscal de référence
  if (rgaData.menage?.revenu) {
    prefillData["champ_Q2hhbXAtNTQyMjU4NQ"] = rgaData.menage.revenu;
  }

  // === SECTION 4: DESCRIPTION DE LA MAISON ===

  // Adresse de la maison concernée par le dossier d'aide
  if (rgaData.logement?.adresse) {
    prefillData["champ_Q2hhbXAtNTU0MjUyNg"] = rgaData.logement.adresse;
  }

  // Année de construction de la maison (format Date attendu)
  if (rgaData.logement?.annee_de_construction) {
    // Convertir l'année en date (1er janvier de l'année)
    prefillData["champ_Q2hhbXAtNTU0MjU2OA"] =
      `${rgaData.logement.annee_de_construction}-01-01`;
  }

  // Êtes-vous bien propriétaire occupant de cette maison ?
  if (rgaData.logement?.proprietaire_occupant !== undefined) {
    prefillData["champ_Q2hhbXAtMTU5OTAwOA"] =
      rgaData.logement.proprietaire_occupant === "oui" ? "true" : "false";
  }

  // Localisation en zone d'exposition au RGA (MultipleDropDown)
  if (rgaData.logement?.zone_dexposition) {
    const zoneMapping: Record<string, string> = {
      faible: "faible",
      moyen: "moyenne",
      fort: "forte",
    };
    const mappedZone = zoneMapping[rgaData.logement.zone_dexposition];
    if (mappedZone) {
      // Pour un MultipleDropDown, DS attend généralement une chaîne ou les valeurs séparées par des virgules 
      prefillData["champ_Q2hhbXAtNTUxMDk4Mw"] = mappedZone;
    }
  }

  // La maison est-elle mitoyenne ?
  if (rgaData.logement?.mitoyen !== undefined) {
    prefillData["champ_Q2hhbXAtNTQxNjY5MQ"] =
      rgaData.logement.mitoyen === "oui" ? "true" : "false";
  }

  // Nombre de niveaux de la maison
  if (rgaData.logement?.niveaux) {
    prefillData["champ_Q2hhbXAtNTQxNzM0OA"] = rgaData.logement.niveaux;
  }

  // Votre maison est-elle bien assurée
  if (rgaData.rga?.assure !== undefined) {
    prefillData["champ_Q2hhbXAtNTYwODAzOA"] =
      rgaData.rga.assure === "oui" ? "true" : "false";
  }

  // Des sinistres au stade précoce ont-ils été identifiés ?
  if (rgaData.rga?.peu_endommage !== undefined) {
    // Inverser la logique : peu_endommage = "oui" => sinistres = "true"
    prefillData["champ_Q2hhbXAtNTQxNzM4OQ"] =
      rgaData.rga.peu_endommage === "oui" ? "true" : "false";
  }

  // Votre maison a-t-elle déjà été indemnisée au titre de la garantie catastrophe naturelle ?
  if (rgaData.rga?.indemnise_rga !== undefined) {
    prefillData["champ_Q2hhbXAtNTUxMDg0NQ"] =
      rgaData.rga.indemnise_rga === "oui" ? "true" : "false";
  }

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
} {
  const errors: string[] = [];

  // Vérifications des champs requis qui peuvent être préremplis
  if (!rgaData.logement?.adresse) {
    errors.push("L'adresse du logement est requise");
  }

  if (!rgaData.menage?.revenu) {
    errors.push("Le revenu fiscal de référence est requis");
  }

  if (!rgaData.menage?.personnes) {
    errors.push("Le nombre de personnes dans le foyer est requis");
  }

  if (!rgaData.logement?.annee_de_construction) {
    errors.push("L'année de construction est requise");
  }

  if (!rgaData.logement?.zone_dexposition) {
    errors.push("La zone d'exposition est requise");
  }

  if (!rgaData.logement?.proprietaire_occupant === undefined) {
    errors.push("Le statut de propriétaire occupant est requis");
  }

  if (!rgaData.logement?.mitoyen === undefined) {
    errors.push("L'information de mitoyenneté est requise");
  }

  if (!rgaData.logement?.niveaux) {
    errors.push("Le nombre de niveaux est requis");
  }

  if (!rgaData.rga?.assure === undefined) {
    errors.push("Le statut d'assurance est requis");
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

  if (rgaData.logement?.zone_dexposition) {
    summary.push(`Zone: ${rgaData.logement.zone_dexposition}`);
  }

  if (rgaData.menage?.personnes && rgaData.menage?.revenu) {
    summary.push(
      `Foyer: ${rgaData.menage.personnes} personne(s), ${rgaData.menage.revenu}€ de revenu`
    );
  }

  if (rgaData.rga?.assure) {
    summary.push(`Assuré: ${rgaData.rga.assure}`);
  }

  return summary.join(" | ");
}
