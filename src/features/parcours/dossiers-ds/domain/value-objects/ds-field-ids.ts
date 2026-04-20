/**
 * IDs des champs DS utilisés dans le projet (par démarche)
 */
export const DS_FIELD_IDS = {
  ELIGIBILITE: {
    SIRET_AMO: "Q2hhbXAtNTQxOTQyOQ==",
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
  },
  DEVIS: {},
  FACTURES: {},
} as const;

/**
 * Type dérivé des IDs
 */
export type DSFieldId =
  (typeof DS_FIELD_IDS)[keyof typeof DS_FIELD_IDS][keyof (typeof DS_FIELD_IDS)[keyof typeof DS_FIELD_IDS]];
