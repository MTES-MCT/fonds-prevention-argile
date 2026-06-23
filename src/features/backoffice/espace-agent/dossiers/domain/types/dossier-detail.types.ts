import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type {
  InfoDemandeur,
  InfoLogement,
  ParcoursDateProgression,
  AgentEditInfo,
} from "@/features/backoffice/espace-agent/demandes/domain/types/demande-detail.types";
import type { ParcoursCreatorInfo } from "@/features/backoffice/espace-agent/shared/services/parcours-creator.service";
import type { DossierTimelineData } from "@/features/parcours/dossiers-ds/components/DossierTimeline";

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
  /** ID du parcours (pour les notes partagées) */
  parcoursId: string;
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
  /** Statut de la validation AMO (pour distinguer en_attente / éligible / non éligible côté UI). */
  validationStatut: StatutValidationAmo;
  /** Date de passage en instruction (null si jamais passé en instruction) */
  instructedAt: Date | null;
  /** Date de création du parcours */
  parcoursCreatedAt: Date;
  /** Date de dernière mise à jour du parcours */
  lastUpdatedAt: Date;
  /** Date de validation de la demande par l'AMO (null pour un dossier SANS_AMO) */
  suiviDepuis: Date | null;
  /** Informations sur l'indemnisation passée (optionnel) */
  dateIndemnisation?: DateIndemnisation;
  /** Dates de progression du parcours par étape */
  dates: ParcoursDateProgression;
  /** Dates clés (brouillon/dépôt/instruction/décision) du dossier DS, par étape */
  dossiersTimeline: Partial<Record<Step, DossierTimelineData>>;
  /** Informations sur les modifications agent (si données éditées) */
  agentEditInfo?: AgentEditInfo | null;
  /** Agent qui a pré-créé le compte (av-add-dossier), null sinon. */
  creator: ParcoursCreatorInfo | null;
}

// Ré-export des types partagés pour faciliter les imports
export type { InfoDemandeur, InfoLogement, ParcoursDateProgression, AgentEditInfo };
