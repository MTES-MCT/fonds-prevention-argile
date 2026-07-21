/**
 * Entité Allers Vers
 * Structure publique ou privée qui fait connaître le fonds prévention argile
 */
export interface AllersVers {
  id: string;
  nom: string;
  emails: string[];
  telephone: string;
  adresse: string;
  /** Horaires d'ouverture en texte libre (1-2 lignes), ex: "Du mardi au vendredi 8h30 - 12h / 13h - 17h30" */
  horaires?: string | null;
}
