/**
 * Statuts possibles pour la validation AMO
 */
export enum StatutValidationAmo {
  EN_ATTENTE = "en_attente",
  LOGEMENT_ELIGIBLE = "logement_eligible",
  LOGEMENT_NON_ELIGIBLE = "logement_non_eligible",
  ACCOMPAGNEMENT_REFUSE = "accompagnement_refuse",
}

/**
 * Résultat de la récupération des AMO disponibles
 */
export interface AmoDisponible {
  id: string;
  nom: string;
  siret: string;
  departements: string; // Format: "Seine-et-Marne 77, Essonne 91"
  emails: string; // Format: "email1@test.fr;email2@test.fr"
  telephone: string;
  adresse: string;
}

/**
 * Validation AMO avec infos de l'entreprise
 */
export interface ValidationAmoComplete {
  id: string;
  parcoursId: string;
  statut: StatutValidationAmo;
  commentaire: string | null;
  choisieAt: Date;
  valideeAt: Date | null;
  entrepriseAmo: {
    id: string;
    nom: string;
    siret: string;
    departements: string;
    emails: string;
    telephone: string;
    adresse: string;
  };
}
