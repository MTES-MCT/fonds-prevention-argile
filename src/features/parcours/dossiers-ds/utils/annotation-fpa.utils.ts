/**
 * Lecture de l'annotation « lien vers le dossier FPA » (ADR-0025) dans l'autre sens : elle
 * contient l'URL `.../espace-agent/dossiers/<parcoursId>`, donc l'identifiant du parcours.
 * C'est la clé de rattachement d'un dossier déposé à son parcours (ADR-0027).
 */

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// On reconnaît le chemin, pas le libellé de l'annotation : celui-ci peut être renommé
// côté DN, et son id diffère d'une démarche à l'autre (ADR-0025).
const LIEN_FPA = new RegExp(`/espace-agent/dossiers/(${UUID})`, "i");

/** `parcoursId` porté par une annotation, ou `null` si aucune ne contient de lien FPA. */
export function extraireParcoursIdDepuisAnnotations(
  annotations: Array<{ stringValue?: string | null }> | null | undefined
): string | null {
  if (!annotations?.length) return null;

  for (const annotation of annotations) {
    const match = annotation.stringValue?.match(LIEN_FPA);
    if (match) return match[1].toLowerCase();
  }
  return null;
}
