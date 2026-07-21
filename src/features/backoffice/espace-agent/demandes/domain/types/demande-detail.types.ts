import { Step } from "@/shared/domain/value-objects/step.enum";
import { SourceAcquisition } from "@/shared/domain/value-objects/source-acquisition.enum";
import type { ParcoursCreatorInfo } from "@/features/backoffice/espace-agent/shared/services/parcours-creator.service";

/**
 * Types pour la page détail d'une demande d'accompagnement
 */

/**
 * Informations sur le demandeur
 */
export interface InfoDemandeur {
  prenom: string | null;
  nom: string | null;
  /** Nom de famille RNIPP (claim FranceConnect family_name), affiché si différent du nom d'usage */
  nomFamille: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  sourceAcquisition: SourceAcquisition | null;
  sourceAcquisitionPrecision: string | null;
}

/**
 * Informations sur le logement (basées sur RGASimulationData)
 */
export interface InfoLogement {
  /** Type de logement */
  typeLogement: "maison" | "appartement" | null;
  /** Année de construction */
  anneeConstruction: string | null;
  /** Nombre de niveaux */
  nombreNiveaux: string | null;
  /** Mitoyenneté */
  mitoyen: boolean | null;
  /** Couverture par une assurance */
  assure: boolean | null;
  /** Propriétaire occupant */
  proprietaireOccupant: boolean | null;
  /** État de la maison */
  etatMaison: string | null;
  /** Zone d'exposition au risque argile */
  zoneExposition: "faible" | "moyen" | "fort" | null;
  /** Indemnisation passée liée au RGA */
  indemnisationPasseeRGA: boolean | null;
  /** Indemnisation avant juillet 2025 */
  indemnisationAvantJuillet2025: boolean | null;
  /** Indemnisation avant juillet 2015 */
  indemnisationAvantJuillet2015: boolean | null;
  /** Montant de l'indemnisation */
  montantIndemnisation: number | null;
  /** Nombre d'habitants */
  nombreHabitants: number | null;
  /** Niveau de revenu (modeste, très modeste, intermédiaire, supérieur) */
  niveauRevenu: string | null;
  /** Code INSEE de la commune */
  codeInsee: string | null;
  /** Latitude du logement */
  lat: number | null;
  /** Longitude du logement */
  lon: number | null;
  /** RNB ID du bâtiment */
  rnbId: string | null;
}

/**
 * Dates de progression du parcours
 */
export interface ParcoursDateProgression {
  /** Date de création du compte */
  compteCreatedAt: Date;
  /** Date d'envoi de l'invitation (parcours initié par un agent). */
  invitationSentAt?: Date;
  /** Date d'acceptation de l'invitation (connexion FC après claim). */
  invitationAcceptedAt?: Date;
  /** Date où le demandeur a choisi l'AMO */
  amoChoisieAt?: Date;
  /** Date de soumission du formulaire d'éligibilité */
  eligibiliteSubmittedAt?: Date;
  /** Date de soumission du diagnostic */
  diagnosticSubmittedAt?: Date;
  /** Date de soumission des devis */
  devisSubmittedAt?: Date;
  /** Date de transmission des factures */
  facturesSubmittedAt?: Date;
  /** Date d'acceptation de l'éligibilité par la DDT */
  eligibiliteProcessedAt?: Date;
  /** Date d'acceptation du diagnostic par la DDT */
  diagnosticProcessedAt?: Date;
  /** Date d'acceptation des devis par la DDT */
  devisProcessedAt?: Date;
  /** Date d'acceptation des factures par la DDT */
  facturesProcessedAt?: Date;
}

/**
 * Informations sur les modifications agent de la simulation.
 * Utilisé par InfoLogement pour afficher le diff original → modifié.
 */
export interface AgentEditInfo {
  /** Prénom de l'agent qui a fait les modifications */
  agentPrenom: string;
  /** Nom de famille de l'agent qui a fait les modifications */
  agentNom: string;
  /** Date de la modification */
  editedAt: Date;
  /** Nombre de champs modifiés */
  nombreModifications: number;
  /**
   * Valeurs originales (avant modification agent) pour chaque champ modifié.
   * Clé = nom du champ InfoLogement, valeur = string formatée pour l'affichage.
   */
  originalDisplayValues: Record<string, string>;
}

/**
 * Détail complet d'une demande d'accompagnement
 */
export interface DemandeDetail {
  /** ID de la validation AMO */
  id: string;
  /** ID du parcours (pour les notes partagées) */
  parcoursId: string;
  /** Informations sur le demandeur */
  demandeur: InfoDemandeur;
  /** Informations sur le logement */
  logement: InfoLogement;
  /** Statut actuel de la demande */
  statut: string;
  /** Date de création de la demande */
  dateCreation: Date;
  /** Commentaire éventuel de l'AMO */
  commentaire: string | null;
  /** L'AMO est-elle mandataire financier ? (renseigné si la demande est acceptée) */
  estMandataireFinancier: boolean | null;
  /** Étape actuelle du parcours */
  currentStep: Step;
  /** Date de création du parcours */
  parcoursCreatedAt: Date;
  /** Dates de progression du parcours par étape */
  dates: ParcoursDateProgression;
  /** Informations sur les modifications agent (si données éditées) */
  agentEditInfo?: AgentEditInfo | null;
  /** Agent qui a pré-créé le compte (av-add-dossier), null sinon. */
  creator: ParcoursCreatorInfo | null;
}
