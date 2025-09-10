export interface PrefillData {
  [key: string]: string | number | boolean | null;
}

export interface CreateDossierRequest {
  [champId: string]: string | number | boolean | null;
}

export interface CreateDossierResponse {
  dossier_url: string;
  dossier_id: string;
  dossier_number: number;
}

export interface DemarcheSchema {
  id: string;
  number: string;
  title: string;
  description: string;
  state: "brouillon" | "publiee" | "close";
  declarative: boolean | null;
  dateCreation: string;
  datePublication: string | null;
  dateDerniereModification: string;
  dateDepublication: string | null;
  dateFermeture: string | null;
  notice: string | null;
  deliberation: string | null;
  cadreJuridiqueUrl: string | null;
  revision: {
    id: string;
    datePublication: string;
    champDescriptors: ChampDescriptor[];
  };
}

export interface ChampDescriptor {
  __typename: ChampType;
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export type ChampType =
  | "TextChampDescriptor"
  | "TextareaChampDescriptor"
  | "EmailChampDescriptor"
  | "PhoneChampDescriptor"
  | "AddressChampDescriptor"
  | "NumberChampDescriptor"
  | "DecimalNumberChampDescriptor"
  | "IntegerNumberChampDescriptor"
  | "CheckboxChampDescriptor"
  | "CiviliteChampDescriptor"
  | "DateChampDescriptor"
  | "DatetimeChampDescriptor"
  | "DropDownListChampDescriptor"
  | "MultipleDropDownListChampDescriptor"
  | "LinkedDropDownListChampDescriptor"
  | "YesNoChampDescriptor"
  | "SiretChampDescriptor"
  | "IbanChampDescriptor"
  | "PieceJustificativeChampDescriptor"
  | "TitreIdentiteChampDescriptor"
  | "CommuneChampDescriptor"
  | "DepartementChampDescriptor"
  | "RegionChampDescriptor"
  | "PaysChampDescriptor"
  | "RepetitionChampDescriptor"
  | "HeaderSectionChampDescriptor"
  | "ExplicationChampDescriptor";

export interface DemarcheStats {
  dossiers_count: number;
  dossiers_en_construction_count: number;
  dossiers_en_instruction_count: number;
  dossiers_termines_count: number;
  dossiers_deposes_count: number;
  dossiers_acceptes_count: number;
  dossiers_refuses_count: number;
  dossiers_classes_sans_suite_count: number;
}
