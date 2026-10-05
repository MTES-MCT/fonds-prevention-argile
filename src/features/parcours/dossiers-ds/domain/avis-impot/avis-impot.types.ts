import type { DossierState } from "../../adapters/graphql/types";
import type { AdresseMaisonDeclaree } from "../adresse-maison";

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
  /** Dernière modification des champs par l'usager : repère pour relancer le contrôle. */
  champsModifiesAt: string | null;
  declaratif: DeclaratifFoyer;
  /** Département de la commune du logement : décide du barème (IdF ou non). */
  codeDepartement: string | null;
  adresseMaison: AdresseMaisonDeclaree;
  avis: AvisImpotExtrait[];
  /** Valeur actuelle de chaque annotation privée, par id de descripteur. */
  annotations: Record<string, string | null>;
}
