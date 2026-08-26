/**
 * Lecture de l'annotation « lien vers le dossier FPA » (ADR-0025) dans l'autre sens : elle
 * contient l'URL `.../espace-agent/dossiers/<parcoursId>`, donc l'identifiant du parcours.
 * C'est la clé de rattachement d'un dossier déposé à son parcours (ADR-0027).
 */

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// On reconnaît le chemin, pas le libellé de l'annotation : celui-ci peut être renommé
// côté DN, et son id diffère d'une démarche à l'autre (ADR-0025).
const LIEN_FPA = new RegExp(`/espace-agent/dossiers/(${UUID})`, "i");

/**
 * Tous les `parcoursId` distincts portés par les annotations d'un dossier.
 *
 * Il y en a normalement zéro ou un. Deux valeurs différentes signifient qu'une annotation a
 * été modifiée à la main côté DN, ou qu'un dossier a été dupliqué : le dossier est alors
 * ambigu et ne doit **jamais** être rattaché automatiquement (ADR-0027).
 */
export function extraireParcoursIdsDepuisAnnotations(
  annotations: Array<{ stringValue?: string | null }> | null | undefined
): string[] {
  if (!annotations?.length) return [];

  const ids = new Set<string>();
  for (const annotation of annotations) {
    const match = annotation.stringValue?.match(LIEN_FPA);
    if (match) ids.add(match[1].toLowerCase());
  }
  return [...ids];
}

/** `parcoursId` porté par une annotation, ou `null` si aucune (ou si plusieurs divergent). */
export function extraireParcoursIdDepuisAnnotations(
  annotations: Array<{ stringValue?: string | null }> | null | undefined
): string | null {
  const ids = extraireParcoursIdsDepuisAnnotations(annotations);
  return ids.length === 1 ? ids[0] : null;
}
