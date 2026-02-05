/**
 * Types pour la page d'accueil de l'espace AMO
 */

/**
 * Demande d'accompagnement à traiter (statut EN_ATTENTE)
 */
export interface DemandeAccompagnement {
  /** ID de la validation AMO (pour le lien vers la page détail) */
  id: string;
  /** Prénom du demandeur */
  prenom: string | null;
  /** Nom du demandeur */
  nom: string | null;
  /** Nom de la commune du logement */
  commune: string | null;
  /** Code postal du logement */
  codePostal: string | null;
  /** Date de création de la demande */
  dateCreation: Date;
}

/**
 * Données pour la page d'accueil de l'espace AMO
 */
export interface AmoAccueilData {
  /** Nombre de demandes d'accompagnement en attente */
  nombreDemandesEnAttente: number;
  /** Nombre total de dossiers suivis (demandes acceptées) */
  nombreDossiersSuivis: number;
  /** Liste des demandes d'accompagnement à traiter */
  demandesATraiter: DemandeAccompagnement[];
}
