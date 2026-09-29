import type { DossierState } from "../../adapters/graphql/types";

/** Un avis d'imposition déposé, avec ce que DN a lu dans son 2D-Doc (null si non lu). */
export interface AvisImpotExtrait {
  champDescriptorId: string;
  libelleChamp: string;
  dansRepetition: boolean;
  nombreFichiers: number;
  /** Au moins une donnée fiscale lue : sinon 2D-Doc absent, illisible ou pas encore analysé. */
  lu: boolean;
  declarant1: string | null;
  declarant2: string | null;
  referenceAvis: string | null;
  anneeRevenus: number | null;
  nombreParts: number | null;
  revenuFiscalReference: number | null;
  dateMiseEnRecouvrement: string | null;
  /** Colonnes que DN expose et que l'on ne sait pas lire : signale un changement côté DN. */
  attributsInconnus: string[];
}

export interface DeclaratifFoyer {
  nombrePersonnes: number | null;
  revenuFiscalReference: number | null;
}

export interface DonneesAvisImpotDossier {
  dossierId: string;
  numero: number;
  etat: DossierState;
  demarcheNumero: number | null;
  dateDepot: string | null;
  declaratif: DeclaratifFoyer;
  avis: AvisImpotExtrait[];
}
