import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

/**
 * Paramètres de création d'un dossier par un agent Aller-vers.
 */
export interface CreateDossierByAgentParams {
  agentId: string;
  demandeur: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
  };
  adresseBien: string;
  /** Données de simulation remplies par l'agent (parcours 2). */
  rgaSimulationDataAgent?: RGASimulationData;
  /** Envoie un email d'invitation au demandeur avec un lien de claim. */
  sendEmail: boolean;
}

export interface CreateDossierByAgentResult {
  userId: string;
  parcoursId: string;
  claimToken: string;
  claimUrl: string;
  emailSent: boolean;
}

/** Durée de vie du claim token (90 jours). */
export const CLAIM_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
