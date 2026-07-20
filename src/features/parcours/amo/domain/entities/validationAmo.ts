import type { StatutValidationAmo } from "../value-objects/statutValidation";
import type { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { Amo } from "./amo";

/**
 * Validation AMO (base)
 *
 * `entrepriseAmoId` est null lorsque le demandeur a renoncé à un AMO
 * (statut `SANS_AMO`, attributionMode `AUCUN`).
 */
export interface ValidationAmo {
  id: string;
  parcoursId: string;
  entrepriseAmoId: string | null;
  attributionMode: AttributionAmoMode;
  statut: StatutValidationAmo;
  commentaire: string | null;
  choisieAt: Date;
  valideeAt: Date | null;
  userPrenom: string | null;
  userNom: string | null;
  adresseLogement: string | null;
}

/**
 * Validation AMO avec infos complètes de l'entreprise.
 *
 * `entrepriseAmo` est null quand le parcours est « sans AMO » (autonomie).
 */
export interface ValidationAmoComplete {
  id: string;
  parcoursId: string;
  statut: StatutValidationAmo;
  commentaire: string | null;
  choisieAt: Date;
  valideeAt: Date | null;
  /** null = question non posée ou non répondue (traité comme non-mandataire). */
  estMandataireFinancier: boolean | null;
  /** Non-null = arrêt demandé, en attente de la réponse de l'AMO mandataire. */
  demandeArretAt: Date | null;
  entrepriseAmo: Amo | null;
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
    email: string;
    telephone: string;
    adresseLogement: string;
  };
  statut: StatutValidationAmo;
  choisieAt: Date;
  usedAt: Date | null;
  isExpired: boolean;
  isUsed: boolean;
}
