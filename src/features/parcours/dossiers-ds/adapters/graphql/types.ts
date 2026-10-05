interface DemarcheBase {
  id: string;
  number: number;
  title: string;
  state: DemarcheState;
  dateCreation: string;
  dateDerniereModification: string;
  dateDepublication?: string;
  datePublication?: string;
}

export interface DemarcheDetailed extends DemarcheBase {
  description?: string;
  service?: ServiceInfo;
  champDescriptors?: ChampDescriptor[];
  activeRevision?: Revision;
  dossiers?: DossiersConnection;
}

export interface Revision {
  id: string;
  datePublication?: string;
  champDescriptors: ChampDescriptor[];
}

export interface ServiceInfo {
  id: string;
  nom: string;
  organisme: string;
  typeOrganisme?: string;
}

export interface ChampDescriptor {
  __typename?: string;
  id: string;
  type?: string;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  champDescriptors?: ChampDescriptor[];
  // Modèle téléchargeable, présent uniquement sur PieceJustificativeChampDescriptor.
  fileTemplate?: FileTemplate | null;
}

export interface FileTemplate {
  filename: string;
  url: string;
  contentType?: string;
  byteSize?: number;
}

export interface Dossier {
  id: string;
  number: number;
  state: DossierState;
  archived: boolean;
  datePassageEnConstruction?: string;
  datePassageEnInstruction?: string;
  dateTraitement?: string;
  dateDerniereCorrectionEnAttente?: string;
  dateDerniereModificationChamps?: string;
  motivation?: string;
  motivationAttachment?: Attachment;
  attestation?: Attachment;
  pdf?: Attachment;
  usager?: Usager;
  instructeurs?: Instructeur[];
  champs?: Champ[];
  annotations?: Annotation[];
  messages?: Message[];
  avis?: Avis[];
}

export interface Usager {
  email: string;
}

export interface Instructeur {
  id: string;
  email: string;
}

export type ChampValue = string | number | boolean | Date | null | undefined;

export interface Champ {
  id: string;
  label: string;
  stringValue?: string;
  value?: ChampValue | ChampValue[];
  file?: Attachment;
  files?: Attachment[];
}

export interface Annotation {
  id: string;
  /** Id du descripteur, commun à tous les dossiers d'une démarche (l'`id` change d'un dossier à l'autre). */
  champDescriptorId?: string;
  label: string;
  stringValue?: string;
  instructeur?: Instructeur;
}

export interface Message {
  id: string;
  email: string;
  body: string;
  createdAt: string;
  attachment?: Attachment;
}

export interface Avis {
  id: string;
  question: string;
  reponse?: string;
  dateQuestion: string;
  dateReponse?: string;
  claimant?: Instructeur;
  expert?: Instructeur;
}

export interface Attachment {
  filename: string;
  url: string;
  byteSize?: number;
  checksum?: string;
  contentType?: string;
}

/** Annotation réduite à ce qui sert au rattachement (ADR-0027). */
/** Annotation relue par la synchro : de quoi savoir si un champ est vide. */
export interface AnnotationLue {
  champDescriptorId: string;
  stringValue: string | null;
}

export interface AnnotationReconciliation {
  champDescriptorId: string;
  stringValue?: string | null;
  prefilled?: boolean;
  prefilledValueModified?: boolean;
}

/**
 * Projection minimale d'un dossier pour la réconciliation : pas de `champs`, pas d'email
 * usager, pas de motivation. Balayer une démarche entière ne doit pas ramener de données
 * personnelles dont on n'a pas l'usage.
 */
export interface DossierReconciliation {
  id: string;
  number: number;
  state: DossierState;
  archived: boolean;
  dateDepot?: string;
  dateDerniereModification?: string;
  demarche?: { number: number };
  annotations?: AnnotationReconciliation[];
}

export interface DossiersReconciliationConnection {
  pageInfo: PageInfo;
  nodes: DossierReconciliation[];
}

/** Projection d'inspection : ce qui aide un humain à identifier le demandeur d'un dossier. */
export interface DossierInspection {
  number: number;
  state: DossierState;
  dateDepot?: string;
  deposeParUnTiers?: boolean;
  nomMandataire?: string | null;
  prenomMandataire?: string | null;
  usager?: { email: string };
  demandeur?: { __typename?: string; nom?: string | null; prenom?: string | null };
  champs?: Array<{ champDescriptorId: string; label: string; stringValue?: string | null }>;
}

/** Colonne DN : porte les données qu'il a extraites d'une pièce, ici le 2D-Doc de l'avis. */
export interface ColonneDn {
  __typename: string;
  id: string;
  label: string;
  stringValue?: string | null;
  // Alias : `value` n'a pas le même type d'une colonne à l'autre (BigInt, Float, ISO8601Date).
  valeurEntiere?: string | number | null;
  valeurDecimale?: number | null;
  valeurDate?: string | null;
}

export interface PieceJustificativeChampDn {
  __typename: "PieceJustificativeChamp";
  champDescriptorId: string;
  label: string;
  updatedAt: string;
  nature: string;
  files: Array<{ contentType?: string | null }>;
  columns: ColonneDn[];
}

export interface IntegerNumberChampDn {
  __typename: "IntegerNumberChamp";
  champDescriptorId: string;
  label: string;
  updatedAt: string;
  valeurEntiere?: string | number | null;
}

export interface RepetitionChampDn {
  __typename: "RepetitionChamp";
  champDescriptorId: string;
  label: string;
  updatedAt: string;
  rows: Array<{ champs: ChampAvisImpotDn[] }>;
}

export interface AutreChampDn {
  __typename: string;
  champDescriptorId: string;
  label: string;
  updatedAt: string;
}

export interface CommuneChampDn {
  __typename: "CommuneChamp";
  champDescriptorId: string;
  label: string;
  updatedAt: string;
  departement?: { code: string } | null;
}

export type ChampAvisImpotDn =
  PieceJustificativeChampDn | IntegerNumberChampDn | RepetitionChampDn | CommuneChampDn | AutreChampDn;

/** Projection d'un dossier d'éligibilité pour le contrôle de l'avis d'imposition. */
export interface DossierAvisImpot {
  id: string;
  number: number;
  state: DossierState;
  dateDepot?: string | null;
  dateDerniereModification?: string | null;
  dateDerniereModificationChamps?: string | null;
  demarche?: { number: number } | null;
  champs: ChampAvisImpotDn[];
  annotations: Array<{ champDescriptorId: string; stringValue?: string | null }>;
}

/** Valeur d'annotation, un seul type de champ à la fois (`AnnotationValueInput @oneOf`). */
export type ValeurAnnotationDn =
  | { text: string }
  | { textarea: string }
  | { dropDownList: string }
  // `@oneOf` refuse `null` : un nombre ne se vide pas par l'API.
  | { integerNumber: number };

export interface ModificationAnnotationsDn {
  dossierId: string;
  instructeurId: string;
  annotations: Array<{ id: string; value: ValeurAnnotationDn }>;
}

export interface DossiersConnection {
  pageInfo: PageInfo;
  nodes: Dossier[];
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export type DemarcheState = "brouillon" | "publiee" | "close" | "depubliee";

export type DossierState = "en_construction" | "en_instruction" | "accepte" | "refuse" | "sans_suite";

export interface GraphQLError {
  message: string;
  path?: string[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export type QueryVariables = Record<string, unknown>;

export interface DemarchesFilters {
  state?: DemarcheState;
  since?: string;
  order?: "ASC" | "DESC";
  first?: number;
  after?: string;
}

export interface DossiersFilters {
  first?: number;
  after?: string;
  state?: string;
  archived?: boolean;
  order?: "ASC" | "DESC";
  createdSince?: string; // Format ISO8601DateTime
  updatedSince?: string; // Format ISO8601DateTime
}
