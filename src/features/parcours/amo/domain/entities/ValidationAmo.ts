import type { StatutValidationAmo } from "../value-objects/statutValidation";
import type { Amo } from "./amo";

/**
 * Validation AMO (base)
 */
export interface ValidationAmo {
  id: string;
  parcoursId: string;
  entrepriseAmoId: string;
  statut: StatutValidationAmo;
  commentaire: string | null;
  choisieAt: Date;
  valideeAt: Date | null;
  userPrenom: string | null;
  userNom: string | null;
  adresseLogement: string | null;
}

/**
 * Validation AMO avec infos complètes de l'entreprise
 */
export interface ValidationAmoComplete {
  id: string;
  parcoursId: string;
  statut: StatutValidationAmo;
  commentaire: string | null;
  choisieAt: Date;
  valideeAt: Date | null;
  entrepriseAmo: Amo;
}

/**
 * Données de validation pour l'AMO (via token)
 */
export interface ValidationAmoData {
  validationId: string;
  entrepriseAmo: Amo;
  demandeur: {
    codeInsee: string;
    nom: string;
    prenom: string;
    adresseLogement: string;
  };
  statut: StatutValidationAmo;
  choisieAt: Date;
  usedAt: Date | null;
  isExpired: boolean;
  isUsed: boolean;
}
