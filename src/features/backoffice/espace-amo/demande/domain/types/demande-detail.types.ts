import { Step } from "@/shared/domain/value-objects/step.enum";

/**
 * Types pour la page détail d'une demande d'accompagnement
 */

/**
 * Informations sur le demandeur
 */
export interface InfoDemandeur {
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
}

/**
 * Informations sur le logement (basées sur RGASimulationData)
 */
export interface InfoLogement {
  /** Année de construction */
  anneeConstruction: string | null;
  /** Nombre de niveaux */
  nombreNiveaux: string | null;
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
 * Détail complet d'une demande d'accompagnement
 */
export interface DemandeDetail {
  /** ID de la validation AMO */
  id: string;
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
  /** Étape actuelle du parcours */
  currentStep: Step;
  /** Date de création du parcours */
  parcoursCreatedAt: Date;
}
