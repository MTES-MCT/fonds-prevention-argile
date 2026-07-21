/**
 * Entité AMO (Assistance à Maîtrise d'Ouvrage)
 */
export interface Amo {
  id: string;
  nom: string;
  siret: string;
  departements: string; // Format: "Seine-et-Marne 77, Essonne 91"
  emails: string; // Format: "email1@test.fr;email2@test.fr"
  telephone: string;
  adresse: string;
  /** Horaires d'ouverture en texte libre (1-2 lignes), ex: "Du mardi au vendredi 8h30 - 12h / 13h - 17h30" */
  horaires?: string | null;
}

/**
 * AMO avec ses communes couvertes (pour l'admin)
 */
export interface AmoWithCommunes extends Amo {
  communes: Array<{ codeInsee: string }>;
}
