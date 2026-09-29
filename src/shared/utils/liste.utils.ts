// Accepte `,` et `;` : imports Excel et modales d'édition n'utilisaient pas le même séparateur.
export function parseListe(valeur: string | null | undefined): string[] {
  if (!valeur) return [];
  return String(valeur)
    .split(/[,;]/)
    .map((element) => element.trim())
    .filter((element) => element.length > 0);
}
