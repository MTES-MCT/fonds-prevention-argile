const DEFAULT_VALUE = "Non renseigné";

/**
 * Formate un nom complet à partir du prénom et du nom
 *
 * @param prenom - Prénom (peut être null ou undefined)
 * @param nom - Nom (peut être null ou undefined)
 * @returns Le nom complet formaté ou "Non renseigné" si aucune donnée
 *
 * @example
 * formatNomComplet("Jean", "Dupont") // "Jean Dupont"
 * formatNomComplet("Jean", null) // "Jean"
 * formatNomComplet(null, null) // "Non renseigné"
 */
export function formatNomComplet(prenom: string | null | undefined, nom: string | null | undefined): string {
  if (prenom && nom) {
    return `${prenom} ${nom}`;
  }
  if (prenom) {
    return prenom;
  }
  if (nom) {
    return nom;
  }
  return DEFAULT_VALUE;
}

/**
 * Formate une commune avec son code département
 *
 * @param commune - Nom de la commune (peut être null ou undefined)
 * @param codeDepartement - Code département (peut être null ou undefined)
 * @returns La commune formatée "Commune (XX)" ou "—" si aucune donnée
 *
 * @example
 * formatCommune("Le Poinçonnet", "36") // "Le Poinçonnet (36)"
 * formatCommune("Paris", null) // "Paris"
 * formatCommune(null, null) // "—"
 */
export function formatCommune(commune: string | null | undefined, codeDepartement: string | null | undefined): string {
  if (commune && codeDepartement) {
    return `${commune} (${codeDepartement})`;
  }
  if (commune) {
    return commune;
  }
  return "—";
}
