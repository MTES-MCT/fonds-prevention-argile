/**
 * Raisons de non-éligibilité au Fonds Prévention Argile
 */
export const EligibilityReason = {
  // Étape 1 - Type logement
  APPARTEMENT: "appartement",

  // Étape 2 - Adresse
  ZONE_NON_FORTE: "zone_non_forte",
  DEPARTEMENT_NON_ELIGIBLE: "departement_non_eligible",
  CONSTRUCTION_RECENTE: "construction_recente",
  TROP_DE_NIVEAUX: "trop_de_niveaux",

  // Étape 3 - État maison
  MAISON_ENDOMMAGEE: "maison_endommagee",

  // Étape 4 - Mitoyenneté
  MAISON_MITOYENNE: "maison_mitoyenne",

  // Étape 5 - Revenus
  REVENUS_TROP_ELEVES: "revenus_trop_eleves",

  // Étape 6 - Assurance
  NON_ASSURE: "non_assure",

  // Étape 7 - Propriétaire
  NON_PROPRIETAIRE_OCCUPANT: "non_proprietaire_occupant",

  // Étape 8 - Indemnisation
  DEJA_INDEMNISE: "deja_indemnise",
} as const;

export type EligibilityReason = (typeof EligibilityReason)[keyof typeof EligibilityReason];

/**
 * Messages utilisateur pour chaque raison de non-éligibilité
 */
export const ELIGIBILITY_REASON_MESSAGES: Record<EligibilityReason, string> = {
  [EligibilityReason.APPARTEMENT]: "Le Fonds Prévention Argile concerne uniquement les maisons individuelles.",
  [EligibilityReason.ZONE_NON_FORTE]: "Votre logement n'est pas situé dans une zone d'aléa argile fort.",
  [EligibilityReason.DEPARTEMENT_NON_ELIGIBLE]: "Votre département ne fait pas partie des 11 départements pilotes.",
  [EligibilityReason.CONSTRUCTION_RECENTE]: "Votre maison doit avoir été construite il y a au moins 15 ans.",
  [EligibilityReason.TROP_DE_NIVEAUX]: "Votre maison ne doit pas avoir plus de 2 niveaux.",
  [EligibilityReason.MAISON_ENDOMMAGEE]: "Votre maison présente déjà des désordres structurels importants.",
  [EligibilityReason.MAISON_MITOYENNE]: "Le dispositif concerne uniquement les maisons non mitoyennes.",
  [EligibilityReason.REVENUS_TROP_ELEVES]: "Vos revenus dépassent les plafonds du dispositif.",
  [EligibilityReason.NON_ASSURE]: "Votre maison doit être couverte par une assurance habitation.",
  [EligibilityReason.NON_PROPRIETAIRE_OCCUPANT]: "Vous devez être propriétaire occupant de votre résidence principale.",
  [EligibilityReason.DEJA_INDEMNISE]:
    "Vous avez déjà été indemnisé au titre du RGA dans des conditions non compatibles.",
};
