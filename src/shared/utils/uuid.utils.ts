const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Vrai si la valeur a la forme d'un UUID. À utiliser avant de requêter une colonne
 * `uuid` avec une valeur d'origine externe (segment d'URL, payload) : Postgres rejette
 * un uuid mal formé par une erreur, pas par un résultat vide.
 */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
