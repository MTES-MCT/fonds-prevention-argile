import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { prefillClient } from "@/features/parcours/dossiers-ds/adapters";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { DemarcheSante } from "../domain/diagnostics.types";

/**
 * Cross-check léger de la santé des démarches DS (4 appels max). Capte les causes racines
 * fréquentes : démarche non publiée (blocage dépôt usager) ou démarche inaccessible.
 * Voir docs/parcours/FLOW-AND-SYNC.md §7.2.
 */

const STEPS_AVEC_DEMARCHE: Step[] = [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

async function checkOne(step: Step): Promise<DemarcheSante> {
  let demarcheNumber: number | null = null;
  try {
    const id = prefillClient.getDemarcheId(step);
    demarcheNumber = id ? Number(id) : null;
  } catch {
    return { step, demarcheNumber: null, title: null, state: null, published: false, configured: false, error: null };
  }

  if (!demarcheNumber || Number.isNaN(demarcheNumber)) {
    return { step, demarcheNumber: null, title: null, state: null, published: false, configured: false, error: null };
  }

  try {
    const demarche = await graphqlClient.getDemarcheDetailed(demarcheNumber);
    if (!demarche) {
      return {
        step,
        demarcheNumber,
        title: null,
        state: null,
        published: false,
        configured: true,
        error: "Démarche introuvable côté DS",
      };
    }
    return {
      step,
      demarcheNumber,
      title: demarche.title ?? null,
      state: demarche.state ?? null,
      published: demarche.state === "publiee",
      configured: true,
      error: null,
    };
  } catch (error) {
    return {
      step,
      demarcheNumber,
      title: null,
      state: null,
      published: false,
      configured: true,
      error: error instanceof Error ? error.message : "Erreur API DS",
    };
  }
}

export async function getDemarchesSante(): Promise<DemarcheSante[]> {
  return Promise.all(STEPS_AVEC_DEMARCHE.map(checkOne));
}
