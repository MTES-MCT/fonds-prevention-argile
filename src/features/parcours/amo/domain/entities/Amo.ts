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
}

/**
 * AMO avec ses communes couvertes (pour l'admin)
 */
export interface AmoWithCommunes extends Amo {
  communes: Array<{ codeInsee: string }>;
}
