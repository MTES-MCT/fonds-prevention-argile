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

export type DossierState =
  | "en_construction"
  | "en_instruction"
  | "accepte"
  | "refuse"
  | "sans_suite";

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
