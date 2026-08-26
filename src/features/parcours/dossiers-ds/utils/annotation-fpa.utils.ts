import type { AnnotationReconciliation } from "../adapters/graphql/types";

/**
 * Lecture de l'annotation « lien vers le dossier FPA » (ADR-0025) dans l'autre sens : elle
 * contient l'URL `.../espace-agent/dossiers/<parcoursId>`, donc l'identifiant du parcours.
 * C'est la clé de rattachement d'un dossier déposé à son parcours (ADR-0027).
 */

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const LIEN_FPA = new RegExp(`/espace-agent/dossiers/(${UUID})`, "i");

export interface LectureAnnotationFpa {
  /** `null` si absente, illisible, ou si plusieurs annotations divergent. */
  parcoursId: string | null;
  /** Plusieurs valeurs de parcours différentes : dossier dupliqué ou annotation retouchée. */
  ambigue: boolean;
  /** DN signale que la valeur préremplie a été modifiée à la main : elle ne fait plus foi. */
  modifiee: boolean;
}

/**
 * Lit l'annotation FPA d'un dossier.
 *
 * L'annotation attendue est identifiée par son **descripteur** (`champDescriptorId`), pas par
 * son libellé — renommable côté DN — ni par l'id de l'instance, qui change d'un dossier à
 * l'autre. Quand le descripteur n'est pas connu (démarche non répertoriée), on retombe sur la
 * reconnaissance du chemin dans n'importe quelle annotation.
 */
export function lireAnnotationFpa(
  annotations: AnnotationReconciliation[] | null | undefined,
  champDescriptorId: string | null
): LectureAnnotationFpa {
  if (!annotations?.length) return { parcoursId: null, ambigue: false, modifiee: false };

  const candidates = champDescriptorId
    ? annotations.filter((a) => a.champDescriptorId === champDescriptorId)
    : annotations;

  const ids = new Set<string>();
  let modifiee = false;

  for (const annotation of candidates) {
    const match = annotation.stringValue?.match(LIEN_FPA);
    if (!match) continue;
    ids.add(match[1].toLowerCase());
    if (annotation.prefilledValueModified) modifiee = true;
  }

  const distincts = [...ids];
  return {
    parcoursId: distincts.length === 1 ? distincts[0] : null,
    ambigue: distincts.length > 1,
    modifiee,
  };
}
