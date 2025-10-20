import type { DSStatus } from "../value-objects/ds-status";
import type { Step } from "../../../core/domain/value-objects/step";

/**
 * Entité Dossier Démarches Simplifiées
 */
export interface DossierDS {
  id: string;
  parcoursId: string;
  demarcheId: string;
  demarcheNom: string;
  demarcheEtape: Step;
  numeroDs: number | null;
  etatDs: DSStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dossier DS avec métadonnées
 */
export interface DossierDSWithMeta extends DossierDS {
  isFinalized: boolean;
  isAccepted: boolean;
  isInProgress: boolean;
}
