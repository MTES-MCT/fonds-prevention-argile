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
  demarcheUrl?: string;
  numeroDs: number | null;
  etatDs: DSStatus | null;
  submittedAt: Date | null;
  /** Date de passage en instruction par la DDT (renseignée par la sync DS, null sinon). */
  instructedAt: Date | null;
  /** Date à laquelle le dossier DS a été marqué comme accepté (renseigné par la sync DS). */
  processedAt: Date | null;
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
