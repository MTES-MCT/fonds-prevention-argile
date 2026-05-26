import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import type { Responsable } from "@/features/parcours/core/domain/services/responsable.service";

/**
 * Élément unifié de la liste « dossiers par territoire ».
 * Couvre indifféremment dossiers avec ou sans validation AMO.
 */
export interface DossierItem {
  parcoursId: string;
  particulier: {
    prenom: string;
    nom: string;
    email: string;
    telephone: string | null;
  };
  logement: {
    commune: string | null;
    codeDepartement: string | null;
    codeEpci: string | null;
  };
  currentStep: Step;
  currentStatus: Status;
  situationParticulier: SituationParticulier;
  /** Validation AMO si elle existe (null pour un parcours sans AMO assigné). */
  validation: {
    id: string;
    statut: StatutValidationAmo;
    entrepriseAmoId: string | null;
    choisieAt: Date;
    valideeAt: Date | null;
  } | null;
  /** Statut DS de l'étape courante (null si pas de dossier DS pour cette étape). */
  dsStatus: DSStatus | null;
  /** Agent qui a pré-créé le dossier (cas invitation AV), null sinon. */
  createdByAgentId: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Responsable du dossier à l'instant T (dérivé par `getResponsableDossier`). */
  responsable: Responsable;
  /** L'agent connecté peut-il agir au titre du responsable (archiver, qualifier) ? */
  canActAsResponsable: boolean;
}

/** Filtres optionnels appliqués au listing. */
export interface DossiersTerritoireFilters {
  step?: Step;
  search?: string;
}

/** Choix proposé dans le filtre EPCI : libellé lisible + code SIREN. */
export interface EpciChoice {
  code: string;
  nom: string;
}

export interface DossiersTerritoireResult {
  dossiers: DossierItem[];
  total: number;
  territoiresCouverts: {
    departements: string[];
    epcis: string[];
  };
  /** EPCI distincts présents dans les dossiers retournés, avec leur nom lisible. */
  epcisDisponibles: EpciChoice[];
}
