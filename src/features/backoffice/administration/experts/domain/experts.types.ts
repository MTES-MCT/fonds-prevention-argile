/** Un département d'intervention : le contact de réservation, puis l'expert qui se déplace. */
export interface DepartementExpert {
  code: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  expertNom: string | null;
  expertEmail: string | null;
  expertTelephone: string | null;
}

/**
 * Projection de l'annuaire : ce qu'un agent ou un administrateur reçoit.
 * Ni contact interne ni désactivation : ces champs ne sortent pas du serveur pour eux.
 */
export interface ExpertAnnuaire {
  id: string;
  nom: string;
  siret: string;
  dateValidationDhup: string | null;
  departements: DepartementExpert[];
}

/** Projection de gestion, réservée au super-administrateur. */
export interface ExpertGestion extends ExpertAnnuaire {
  contactInterne: { nom: string | null; email: string | null; telephone: string | null };
  desactivation: { le: string; par: string | null; raison: string | null } | null;
}

/** Expert tel que lu en base, avant toute projection. */
export interface ExpertComplet {
  id: string;
  nom: string;
  siret: string;
  dateValidationDhup: string | null;
  contactInterneNom: string | null;
  contactInterneEmail: string | null;
  contactInterneTelephone: string | null;
  desactiveAt: Date | null;
  desactiveParNom: string | null;
  desactiveRaison: string | null;
  departements: {
    codeDepartement: string;
    email: string | null;
    telephone: string | null;
    expertNom: string | null;
    expertEmail: string | null;
    expertTelephone: string | null;
  }[];
}
