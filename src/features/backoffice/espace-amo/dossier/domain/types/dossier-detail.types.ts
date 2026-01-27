import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import type {
  InfoDemandeur,
  InfoLogement,
} from "@/features/backoffice/espace-amo/demande/domain/types/demande-detail.types";

/**
 * Types pour la page détail d'un dossier suivi
 */

/**
 * Informations sur l'indemnisation passée
 */
export interface DateIndemnisation {
  debut: Date;
  fin: Date;
  montant: number;
}

/**
 * Détail complet d'un dossier suivi
 */
export interface DossierDetail {
  /** ID de la validation AMO */
  id: string;
  /** Informations sur le demandeur */
  demandeur: InfoDemandeur;
  /** Informations sur le logement */
  logement: InfoLogement;
  /** Étape actuelle du parcours */
  currentStep: Step;
  /** Statut actuel du parcours */
  currentStatus: Status;
  /** Statut DS du dossier de l'étape courante */
  dsStatus: DSStatus | null;
  /** Date de création du parcours */
  parcoursCreatedAt: Date;
  /** Date de dernière mise à jour du parcours */
  lastUpdatedAt: Date;
  /** Date de validation de la demande par l'AMO */
  suiviDepuis: Date;
  /** Informations sur l'indemnisation passée (optionnel) */
  dateIndemnisation?: DateIndemnisation;
}

// Ré-export des types partagés pour faciliter les imports
export type { InfoDemandeur, InfoLogement };
