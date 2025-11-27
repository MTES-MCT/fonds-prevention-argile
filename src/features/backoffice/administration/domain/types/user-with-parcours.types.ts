import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

/**
 * Informations détaillées sur l'utilisateur et son parcours
 */
export interface UserWithParcoursDetails {
  // ===== Informations utilisateur =====
  user: {
    id: string;
    fcId: string;
    email: string | null;
    name: string | null;
    firstName: string | null;
    telephone: string | null;
    lastLogin: Date;
    createdAt: Date;
    updatedAt: Date;
  };

  // ===== Parcours prévention =====
  parcours: {
    id: string;
    currentStep: Step;
    currentStatus: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt: Date | null;
    rgaSimulationCompletedAt: Date | null;
    rgaDataDeletedAt: Date | null;
  } | null;

  // ===== Données simulation RGA =====
  rgaSimulation: {
    logement: {
      adresse: string;
      commune: string;
      codeInsee: string;
      departement: string;
      typeConstruction: string;
    } | null;
  } | null;

  // ===== Validation AMO =====
  amoValidation: {
    id: string;
    statut: StatutValidationAmo;
    choisieAt: Date;
    valideeAt: Date | null;
    commentaire: string | null;

    // Infos AMO
    amo: {
      id: string;
      nom: string;
      siret: string | null;
      adresse: string | null;
      emails: string;
      telephone: string | null;
    };

    // Données user temporaires (avant validation)
    userData: {
      prenom: string | null;
      nom: string | null;
      email: string | null;
      telephone: string | null;
      adresseLogement: string | null;
    };

    // Token de validation AMO
    token: {
      id: string;
      token: string;
      createdAt: Date;
      expiresAt: Date;
      usedAt: Date | null;
    } | null;

    // Tracking email Brevo
    emailTracking: {
      brevoMessageId: string | null;
      sentAt: Date | null;
      deliveredAt: Date | null;
      openedAt: Date | null;
      clickedAt: Date | null;
      bounceType: "hard" | "soft" | null;
      bounceReason: string | null;
    };
  } | null;

  // ===== Dossiers Démarches Simplifiées =====
  dossiers: {
    eligibilite: DossierInfo | null;
    diagnostic: DossierInfo | null;
    devis: DossierInfo | null;
    factures: DossierInfo | null;
  };
}

/**
 * Informations sur un dossier DS
 */
export interface DossierInfo {
  id: string;
  dsNumber: string | null;
  dsId: string | null;
  dsStatus: string;
  submittedAt: Date | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date | null;
}

/**
 * Statut simplifié du tracking email pour affichage
 */
export type EmailTrackingStatus =
  | "non_envoye" // Pas de brevoMessageId
  | "envoye" // sentAt renseigné
  | "delivre" // deliveredAt renseigné
  | "ouvert" // openedAt renseigné
  | "clique" // clickedAt renseigné
  | "bounce_soft" // bounceType = soft
  | "bounce_hard"; // bounceType = hard
