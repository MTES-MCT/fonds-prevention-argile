/**
 * Type pour un champ DS
 */
export interface DSField {
  id: string;
  label: string;
  section: DSSection;
  type: DSFieldType;
  rgaPath?: string; // Chemin dans l'objet RGAFormData
  transformer?: (
    value: unknown,
    rgaData?: Record<string, unknown>
  ) => string | number | boolean | (string | number)[];
  // Fonction de transformation
}

/**
 * Types de champs DS
 */
export enum DSFieldType {
  TEXT = "text",
  EMAIL = "email",
  PHONE = "phone",
  NUMBER = "integer_number",
  DATE = "date",
  CHECKBOX = "checkbox",
  FILE = "piece_justificative",
  TEXTAREA = "textarea",
  DROPDOWN = "drop_down_list",
  MULTIPLE_DROPDOWN = "multiple_drop_down_list",
  ADDRESS = "address",
  COMMUNE = "communes",
}

/**
 * Sections du formulaire DS
 */
export enum DSSection {
  DEMANDEUR = "Identification du demandeur",
  REPRESENTANT = "Représentant légal",
  AMO = "AMO",
  MAISON = "Description de la maison",
  ENGAGEMENTS = "Engagements",
}

/**
 * Mapping complet des champs DS
 */
export const DS_FIELDS: Record<string, DSField> = {
  // === SECTION 1: IDENTIFICATION DU DEMANDEUR ===
  "Q2hhbXAtNTQyMjQzNQ==": {
    id: "Q2hhbXAtNTQyMjQzNQ==",
    label: "Adresse de correspondance",
    section: DSSection.DEMANDEUR,
    type: DSFieldType.ADDRESS,
  },
  "Q2hhbXAtNTQyMjQ0MA==": {
    id: "Q2hhbXAtNTQyMjQ0MA==",
    label: "Numéro de téléphone",
    section: DSSection.DEMANDEUR,
    type: DSFieldType.PHONE,
  },
  "Q2hhbXAtNTQyMjQ0Mg==": {
    id: "Q2hhbXAtNTQyMjQ0Mg==",
    label: "Adresse électronique",
    section: DSSection.DEMANDEUR,
    type: DSFieldType.EMAIL,
  },
  "Q2hhbXAtNTU0Mjc5NQ==": {
    id: "Q2hhbXAtNTU0Mjc5NQ==",
    label: "Pièce d'identité",
    section: DSSection.DEMANDEUR,
    type: DSFieldType.FILE,
  },
  "Q2hhbXAtNTQyMjU4NA==": {
    id: "Q2hhbXAtNTQyMjU4NA==",
    label: "Nombre de personnes dans le ménage",
    section: DSSection.DEMANDEUR,
    type: DSFieldType.NUMBER,
    rgaPath: "menage.personnes",
  },

  // Désactivé pour le moment vu avec martin / guillaume le 17/10/2025
  // "Q2hhbXAtNTQyMjU4NQ==": {
  //   id: "Q2hhbXAtNTQyMjU4NQ==",
  //   label: "Revenu fiscal de référence",
  //   section: DSSection.DEMANDEUR,
  //   type: DSFieldType.NUMBER,
  //   rgaPath: "menage.revenu_rga",
  // },
  "Q2hhbXAtNTU0Mjc5NA==": {
    id: "Q2hhbXAtNTU0Mjc5NA==",
    label: "Dernier avis d'imposition",
    section: DSSection.DEMANDEUR,
    type: DSFieldType.FILE,
  },

  // === SECTION 2: REPRÉSENTANT LÉGAL ===
  "Q2hhbXAtNTU0MjgxNg==": {
    id: "Q2hhbXAtNTU0MjgxNg==",
    label: "Pièce d'identité du mandataire",
    section: DSSection.REPRESENTANT,
    type: DSFieldType.FILE,
  },
  "Q2hhbXAtNTQyMjY4MQ==": {
    id: "Q2hhbXAtNTQyMjY4MQ==",
    label: "Adresse du mandataire",
    section: DSSection.REPRESENTANT,
    type: DSFieldType.ADDRESS,
  },
  "Q2hhbXAtNTQyMjY4NA==": {
    id: "Q2hhbXAtNTQyMjY4NA==",
    label: "Téléphone du mandataire",
    section: DSSection.REPRESENTANT,
    type: DSFieldType.PHONE,
  },
  "Q2hhbXAtNTQyMjY4Ng==": {
    id: "Q2hhbXAtNTQyMjY4Ng==",
    label: "Email du mandataire",
    section: DSSection.REPRESENTANT,
    type: DSFieldType.EMAIL,
  },
  "Q2hhbXAtNTQyMjY4OQ==": {
    id: "Q2hhbXAtNTQyMjY4OQ==",
    label: "Agissant en tant que",
    section: DSSection.REPRESENTANT,
    type: DSFieldType.TEXT,
  },

  // === SECTION 3: AMO ===
  "Q2hhbXAtNTQxOTQyOQ==": {
    id: "Q2hhbXAtNTQxOTQyOQ==",
    label: "Numéro SIRET de l'AMO",
    section: DSSection.AMO,
    type: DSFieldType.TEXT,
  },
  "Q2hhbXAtNTQxOTQzMg==": {
    id: "Q2hhbXAtNTQxOTQzMg==",
    label: "Adresse de l'AMO",
    section: DSSection.AMO,
    type: DSFieldType.ADDRESS,
  },
  "Q2hhbXAtNTQxOTQ2Mg==": {
    id: "Q2hhbXAtNTQxOTQ2Mg==",
    label: "Email de l'AMO",
    section: DSSection.AMO,
    type: DSFieldType.EMAIL,
  },
  "Q2hhbXAtNTQxOTQ2NA==": {
    id: "Q2hhbXAtNTQxOTQ2NA==",
    label: "Téléphone de l'AMO",
    section: DSSection.AMO,
    type: DSFieldType.PHONE,
  },

  // === SECTION 4: DESCRIPTION DE LA MAISON ===
  // Nouveau champ d'adresse en format texte créé par Martin en attendant le format structuré / automatique géré coté Démarches Simplifiées
  "Q2hhbXAtNTYzNjA2NA==": {
    id: "Q2hhbXAtNTYzNjA2NA==",
    label: "Adresse (texte) de la maison concernée par le dossier d'aide",
    section: DSSection.MAISON,
    type: DSFieldType.TEXT,
    rgaPath: "logement.adresse",
    transformer: (value: unknown) => {
      if (typeof value !== "string") return "";

      // Extraire uniquement le numéro et nom de rue (avant le code postal)
      // Format attendu: "19B Rue des Clefs Moreaux 36250 Saint-Maur"
      // On garde: "19B Rue des Clefs Moreaux"
      const match = value.match(/^(.+?)\s+\d{5}/);
      const rueSeule = match ? match[1].trim() : value;

      return rueSeule;
    },
  },

  // Champ Code Commune (ajouté par Martin pour faciliter la saisie de l'adresse)
  "Q2hhbXAtNTY0ODQ3NA==": {
    id: "Q2hhbXAtNTY0ODQ3NA==",
    label: "Commune",
    section: DSSection.MAISON,
    type: DSFieldType.COMMUNE,
    rgaPath: "logement.commune",
    transformer: (value: unknown, fullData?: Record<string, unknown>) => {
      const codeInsee = typeof value === "string" ? value : "";
      const logement = fullData?.logement as { adresse?: string } | undefined;

      // Extraire le code postal depuis l'adresse complète
      const adresse = logement?.adresse;
      const codePostalMatch =
        typeof adresse === "string" ? adresse.match(/\b(\d{5})\b/) : null;
      const codePostal = codePostalMatch ? codePostalMatch[1] : "";

      // Format tableau: [codePostal, codeInsee]
      const result = [codePostal, codeInsee];

      return result;
    },
  },
  // // Champ d'adresse structuré (non utilisé actuellement car non géré par DS)
  // "Q2hhbXAtNTU0MjUyNg==": {
  //   id: "Q2hhbXAtNTU0MjUyNg==",
  //   label: "Adresse de la maison",
  //   section: DSSection.MAISON,
  //   type: DSFieldType.ADDRESS,
  //   rgaPath: "logement.adresse",
  //   transformer: () => {
  //     // Format JSON stringifié complet (a tester)
  //     return JSON.stringify({
  //       label: "32 Rue des Clefs Moreaux 36250 Saint-Maur",
  //       type: "housenumber",
  //       street_address: "32 Rue des Clefs Moreaux",
  //       street_number: "32",
  //       street_name: "Rue des Clefs Moreaux",
  //       postal_code: "36250",
  //       city_name: "Saint-Maur",
  //       city_code: "36202",
  //       department_code: "36",
  //       region_code: "24",
  //     });
  //   },
  // },
  "Q2hhbXAtNTU0MjU2OA==": {
    id: "Q2hhbXAtNTU0MjU2OA==",
    label: "Année de construction",
    section: DSSection.MAISON,
    type: DSFieldType.DATE,
    rgaPath: "logement.annee_de_construction",
    transformer: (value: unknown) => {
      if (typeof value === "number" || typeof value === "string") {
        return `${value}-01-01`;
      }
      return "";
    },
  },
  "Q2hhbXAtMTU5OTAwOA==": {
    id: "Q2hhbXAtMTU5OTAwOA==",
    label: "Propriétaire occupant",
    section: DSSection.MAISON,
    type: DSFieldType.CHECKBOX,
    rgaPath: "logement.proprietaire_occupant",
    transformer: (value: unknown) => String(value === true || value === "oui"),
  },
  "Q2hhbXAtNTU0MjgyMA==": {
    id: "Q2hhbXAtNTU0MjgyMA==",
    label: "Certificat de propriété",
    section: DSSection.MAISON,
    type: DSFieldType.FILE,
  },
  "Q2hhbXAtNTUxMDk4Mw==": {
    id: "Q2hhbXAtNTUxMDk4Mw==",
    label: "Zone d'exposition RGA",
    section: DSSection.MAISON,
    type: DSFieldType.DROPDOWN,
    rgaPath: "logement.zone_dexposition",
    transformer: (value: unknown) => {
      const zoneMapping: Record<string, string> = {
        faible: "Faible",
        moyen: "Moyenne",
        fort: "Forte",
      };
      return typeof value === "string" && value in zoneMapping
        ? zoneMapping[value]
        : "";
    },
  },
  "Q2hhbXAtNTQxNjY5MQ==": {
    id: "Q2hhbXAtNTQxNjY5MQ==",
    label: "Maison mitoyenne",
    section: DSSection.MAISON,
    type: DSFieldType.CHECKBOX,
    rgaPath: "logement.mitoyen",
    transformer: (value: unknown) => String(value === true || value === "oui"),
  },
  "Q2hhbXAtNTQxNzM0OA==": {
    id: "Q2hhbXAtNTQxNzM0OA==",
    label: "Nombre de niveaux",
    section: DSSection.MAISON,
    type: DSFieldType.NUMBER,
    rgaPath: "logement.niveaux",
  },
  "Q2hhbXAtNTYwODAzOA==": {
    id: "Q2hhbXAtNTYwODAzOA==",
    label: "Maison assurée",
    section: DSSection.MAISON,
    type: DSFieldType.CHECKBOX,
    rgaPath: "rga.assure",
    transformer: (value: unknown) => String(value === true || value === "oui"),
  },
  "Q2hhbXAtNTYwODAzOQ==": {
    id: "Q2hhbXAtNTYwODAzOQ==",
    label: "Certificat d'assurance",
    section: DSSection.MAISON,
    type: DSFieldType.FILE,
  },
  "Q2hhbXAtNTY3MDU4OA==": {
    id: "Q2hhbXAtNTY3MDU4OA==",
    label: "Désordres architecturaux identifiés",
    type: DSFieldType.CHECKBOX,
    section: DSSection.MAISON,
    rgaPath: "rga.peu_endommage",
    transformer: (value: unknown) => {
      // Oui si endommagée, sinon non
      return String(value === "endommagee" ? "oui" : "non");
    },
  },
  "Q2hhbXAtNTY3MDUwNg==": {
    id: "Q2hhbXAtNTY3MDUwNg==",
    label: "Micro-fissures d'1mm max identitées",
    section: DSSection.MAISON,
    type: DSFieldType.CHECKBOX,
    rgaPath: "rga.peu_endommage",
    transformer: (value: unknown) => {
      // Oui si peu endommagée, sinon non
      return String(value === "peu-endommagee" ? "oui" : "non");
    },
  },
  "Q2hhbXAtNTQxNzM5Mg==": {
    id: "Q2hhbXAtNTQxNzM5Mg==",
    label: "Description des sinistres",
    section: DSSection.MAISON,
    type: DSFieldType.TEXTAREA,
  },
  "Q2hhbXAtNTU0MjgyMw==": {
    id: "Q2hhbXAtNTU0MjgyMw==",
    label: "Photos de la maison",
    section: DSSection.MAISON,
    type: DSFieldType.FILE,
  },
  "Q2hhbXAtNTUxMDg0NQ==": {
    id: "Q2hhbXAtNTUxMDg0NQ==",
    label: "Déjà indemnisé catastrophe naturelle",
    section: DSSection.MAISON,
    type: DSFieldType.CHECKBOX,
    rgaPath: "rga.indemnise_rga",
    transformer: (value: unknown) => String(value === true || value === "oui"),
  },
  "Q2hhbXAtNTU0MjU1MA==": {
    id: "Q2hhbXAtNTU0MjU1MA==",
    label: "Date d'indemnisation",
    section: DSSection.MAISON,
    type: DSFieldType.DATE,
  },
  "Q2hhbXAtNTU0MjU1Mg==": {
    id: "Q2hhbXAtNTU0MjU1Mg==",
    label: "Montant de l'indemnisation",
    section: DSSection.MAISON,
    type: DSFieldType.NUMBER,
  },
  "Q2hhbXAtNTU0Mjc5Mg==": {
    id: "Q2hhbXAtNTU0Mjc5Mg==",
    label: "Certificat d'indemnisation",
    section: DSSection.MAISON,
    type: DSFieldType.FILE,
  },

  // === SECTION 5: ENGAGEMENTS ===
  "Q2hhbXAtMTY5MDkxNg==": {
    id: "Q2hhbXAtMTY5MDkxNg==",
    label: "Attestation sincérité",
    section: DSSection.ENGAGEMENTS,
    type: DSFieldType.CHECKBOX,
  },
  "Q2hhbXAtMjYzNzgwNg==": {
    id: "Q2hhbXAtMjYzNzgwNg==",
    label: "Engagement fourniture documents",
    section: DSSection.ENGAGEMENTS,
    type: DSFieldType.CHECKBOX,
  },
  "Q2hhbXAtMjg3ODY4MA==": {
    id: "Q2hhbXAtMjg3ODY4MA==",
    label: "Engagement conservation documents",
    section: DSSection.ENGAGEMENTS,
    type: DSFieldType.CHECKBOX,
  },
  "Q2hhbXAtNDc2MzcwOA==": {
    id: "Q2hhbXAtNDc2MzcwOA==",
    label: "Information remboursement",
    section: DSSection.ENGAGEMENTS,
    type: DSFieldType.CHECKBOX,
  },
  "Q2hhbXAtNDc2MzcwOQ==": {
    id: "Q2hhbXAtNDc2MzcwOQ==",
    label: "Information versement aide",
    section: DSSection.ENGAGEMENTS,
    type: DSFieldType.CHECKBOX,
  },
};

/**
 * IDs des champs DS utilisés dans le projet (par démarche)
 */
export const DS_FIELD_IDS = {
  ELIGIBILITE: {
    SIRET_AMO: "Q2hhbXAtNTQxOTQyOQ==",
    // Autres champs si besoin
  },
  // Autres démarches si vous en avez
} as const;

/**
 * Récupère les champs par section
 */
export function getFieldsBySection(section: DSSection): DSField[] {
  return Object.values(DS_FIELDS).filter((field) => field.section === section);
}

/**
 * Récupère les IDs des champs par section
 */
export function getFieldIdsBySection(section: DSSection): string[] {
  return getFieldsBySection(section).map((field) => field.id);
}

/**
 * Récupère un mapping simple ID -> Label
 */
export function getFieldLabelsMap(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(DS_FIELDS).map(([id, field]) => [id, field.label])
  );
}

/**
 * Récupère les sections avec leurs champs
 */
export function getSectionsWithFields(): Record<string, string[]> {
  const sections: Record<string, string[]> = {};

  Object.values(DSSection).forEach((section) => {
    sections[section] = getFieldIdsBySection(section);
  });

  return sections;
}

/**
 * Récupère uniquement les champs mappables depuis RGA
 */
export function getMappableFields(): DSField[] {
  return Object.values(DS_FIELDS).filter(
    (field) => field.rgaPath !== undefined
  );
}

/**
 * Helper pour obtenir la valeur d'un chemin dans un objet
 * Ex: getValueByPath({a: {b: 1}}, "a.b") => 1
 */
export function getValueByPath(
  obj: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce((current: unknown, key: string) => {
    return current && typeof current === "object"
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj);
}
