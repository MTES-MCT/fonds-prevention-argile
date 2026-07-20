/**
 * IDs des champs DS utilisés dans le projet (par démarche)
 */
export const DS_FIELD_IDS = {
  ELIGIBILITE: {
    // Section « 2. Identification du représentant légal ou du mandataire » : porte sur le
    // mandataire du DEMANDEUR, pas sur l'AMO. On ne le préremplit que si l'AMO s'est
    // déclarée mandataire financier — seul cas où la réponse est déductible sans ambiguïté.
    MANDATAIRE_FINANCIER: "Q2hhbXAtNjQ3MDQ5Nw==",
    SIRET_AMO: "Q2hhbXAtNTQxOTQyOQ==",
    ADRESSE_AMO: "Q2hhbXAtNTQxOTQzMg==",
    EMAIL_AMO: "Q2hhbXAtNTQxOTQ2Mg==",
    TELEPHONE_AMO: "Q2hhbXAtNTQxOTQ2NA==",
    ADRESSE_MAISON_TEXTE: "Q2hhbXAtNTYzNjA2NA==",
    COMMUNE: "Q2hhbXAtNTY0ODQ3NA==",
    ANNEE_CONSTRUCTION: "Q2hhbXAtNTU0MjU2OA==",
    ZONE_EXPOSITION: "Q2hhbXAtNTUxMDk4Mw==",
    NOMBRE_NIVEAUX: "Q2hhbXAtNTQxNzM0OA==",
  },
  // Autres démarches
  DIAGNOSTIC: {
    // Annotations privées (instructeur)
    ANNOTATION_DOSSIER_ELIGIBILITE: "Q2hhbXAtNTY4MDc2NQ==",
    ANNOTATION_LIEN_FPA: "Q2hhbXAtNjM1MjA4OQ==",
    // Champs métier préremplis (cf. scripts/ops/fetch-demarche-schema.ts)
    ADRESSE_MAISON_TEXTE: "Q2hhbXAtNjU2Mzk2Ng==", // texte simple
    COMMUNE: "Q2hhbXAtNjU2Mzk3MA==", // routage par département
  },
  DEVIS: {
    // Annotations privées (instructeur)
    ANNOTATION_DOSSIER_ELIGIBILITE: "Q2hhbXAtNTY4MDc2NQ==",
    ANNOTATION_DOSSIER_PAIEMENT_ETUDE: "Q2hhbXAtNjY1MjI0MA==",
    ANNOTATION_LIEN_FPA: "Q2hhbXAtNjM1MjA4OQ==",
    // Champs métier préremplis (cf. scripts/ops/ds/fetch-demarche-schema.ts)
    ADRESSE_MAISON_TEXTE: "Q2hhbXAtNjU2MzY2MA==", // texte simple
    COMMUNE: "Q2hhbXAtNjU2MzY2Mg==", // routage par département
  },
  FACTURES: {},
} as const;

/**
 * Options de la liste déroulante « Avez-vous un mandataire, et si oui, est-il financier ? ».
 * Libellés contractuels côté DN : toute divergence fait rejeter la valeur au préremplissage.
 */
export const DS_OPTIONS_MANDATAIRE = {
  AUCUN: "Pas de mandataire",
  NON_FINANCIER: "Mandataire non financier",
  FINANCIER: "Mandataire financier",
} as const;

/**
 * Type dérivé des IDs
 */
export type DSFieldId =
  (typeof DS_FIELD_IDS)[keyof typeof DS_FIELD_IDS][keyof (typeof DS_FIELD_IDS)[keyof typeof DS_FIELD_IDS]];
