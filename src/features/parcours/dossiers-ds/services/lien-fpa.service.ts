import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { getServerEnv } from "@/shared/config/env.config";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { graphqlClient } from "../adapters/graphql/client";
import type { AnnotationLue } from "../adapters/graphql/types";
import { getAnnotationLienFpaId } from "../domain/value-objects/ds-annotations";

/** Permalien du parcours, résolu au clic par l'espace agent (ADR-0025). */
export function lienDossierFpa(parcoursId: string): string {
  return `${getServerEnv().BASE_URL}${ROUTES.backoffice.espaceAgent.dossier(parcoursId)}`;
}

/**
 * Complète l'annotation « lien FPA » d'un dossier synchronisé quand elle est vide, ce que le
 * préremplissage ne sait pas faire après création. Renvoie vrai si une écriture a eu lieu.
 */
export async function completerLienFpa(params: {
  parcoursId: string;
  step: Step;
  dsDemarcheId: string;
  dossierDnId: string;
  annotations: AnnotationLue[];
}): Promise<boolean> {
  const id = getAnnotationLienFpaId(params.step, Number(params.dsDemarcheId));
  if (!id) return false;
  const annotation = params.annotations.find((a) => a.champDescriptorId === id);
  // Une valeur existante n'est jamais écrasée : elle peut désigner un autre parcours (ADR-0027).
  if (!annotation || annotation.stringValue?.trim()) return false;

  await graphqlClient.modifierAnnotations({
    dossierId: params.dossierDnId,
    instructeurId: getServerEnv().DEMARCHES_SIMPLIFIEES_INSTRUCTEUR_ID,
    annotations: [{ id, value: { text: lienDossierFpa(params.parcoursId) } }],
  });
  return true;
}
