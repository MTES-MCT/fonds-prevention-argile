import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

/**
 * Détails structurés d'une adresse BAN, suffisants pour faire matcher un
 * dossier sur le territoire d'un AV (`matchesTerritoire`).
 *
 * Sous-ensemble normalisé de `BanAddressData` (`@/shared/adapters/ban`) pour
 * éviter une dépendance directe sur ce type côté action / service.
 */
export interface AdresseBienDetails {
  label: string;
  clefBan: string;
  codeCommune: string;
  nomCommune: string;
  codePostal: string;
  codeDepartement: string;
  codeRegion: string;
  codeEpci?: string;
  coordinates: { lat: number; lon: number };
}

/**
 * Paramètres de création d'un dossier par un agent (AMO ou Aller-vers).
 */
export interface CreateDossierByAgentParams {
  agentId: string;
  demandeur: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
  };
  adresseBien?: string;
  /**
   * Détails BAN structurés de l'adresse (citycode, département, EPCI, etc.).
   * Permet à `matchesTerritoire` de matcher le dossier sur le territoire AV.
   * Si absent, on stocke uniquement le label dans `logement.adresse` et le
   * dossier sera invisible pour les AV avec filtre territorial.
   */
  adresseBienDetails?: AdresseBienDetails;
  /** Données de simulation remplies par l'agent (parcours 2). */
  rgaSimulationDataAgent?: RGASimulationData;
  /** Envoie un email d'invitation au demandeur avec un lien de claim. */
  sendEmail: boolean;
  /**
   * Intent du wizard. `amo` (défaut) : claim AMO auto si l'agent a un
   * `entrepriseAmoId`. `av` : pas de claim AMO, le dossier reste prospect.
   */
  intent?: "amo" | "av";
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
