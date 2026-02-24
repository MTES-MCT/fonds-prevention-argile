/**
 * Types et constantes pour la qualification des prospects par les agents allers-vers
 */

/** Décision de qualification */
export type QualificationDecision = "eligible" | "a_qualifier" | "non_eligible";

/** Actions réalisées avec le demandeur */
export const QUALIFICATION_ACTIONS = [
  { value: "appel_telephonique", label: "Appel téléphonique" },
  { value: "email_envoye", label: "Email envoyé" },
  { value: "visite_domicile", label: "Visite à domicile" },
  { value: "rendez_vous_structure", label: "Rendez-vous dans ma structure" },
  { value: "autre", label: "Autre" },
] as const;

export type QualificationAction = (typeof QUALIFICATION_ACTIONS)[number]["value"];

/** Décisions possibles */
export const QUALIFICATION_DECISIONS = [
  { value: "eligible", label: "Éligible et peut passer à l'étape AMO" },
  { value: "a_qualifier", label: "À qualifier (infos manquantes)" },
  { value: "non_eligible", label: "Non éligible" },
] as const;

/** Raisons d'inéligibilité (utilisées uniquement si decision = "non_eligible") */
export const RAISONS_INELIGIBILITE = [
  { value: "appartement", label: "Appartement" },
  { value: "pas_zone_alea_fort", label: "Pas en zone d'aléa fort" },
  { value: "hors_zone_perimetre", label: "Hors zone périmètre dispositif fonds RGA" },
  { value: "maison_moins_15_ans", label: "Maison achevée depuis moins de 15 ans" },
  { value: "nombre_etages_sup_2", label: "Nombre d'étages supérieur à 2 (sous-sol compris)" },
  { value: "maison_trop_endommagee", label: "Maison trop endommagée (désordres structurels présents)" },
  { value: "maison_mitoyenne", label: "Maison mitoyenne" },
  { value: "sinistre_deja_indemnise", label: "Sinistre déjà indemnisé au titre du RGA" },
  { value: "pas_assurance_habitation", label: "Pas d'assurance habitation" },
  { value: "locataire_non_occupant", label: "Locataire ou propriétaire non occupant" },
  { value: "hors_plafonds_ressources", label: "Ménage hors des plafonds de ressources" },
  { value: "travaux_deja_realises", label: "Travaux déjà réalisés" },
  { value: "diagnostic_non_concluant", label: "Diagnostic non concluant" },
  { value: "autre", label: "Autre" },
] as const;

export type RaisonIneligibilite = (typeof RAISONS_INELIGIBILITE)[number]["value"];
