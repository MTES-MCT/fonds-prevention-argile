import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { prefillClient } from "@/features/parcours/dossiers-ds/adapters";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DemarcheSanteStatus, type DemarcheSante } from "../domain/diagnostics.types";

/**
 * Cross-check léger de la santé des démarches DN (4 appels max). Capte les causes racines
 * fréquentes : démarche non publiée (blocage dépôt usager) ou pas encore créée (devis/factures).
 * Voir docs/parcours/FLOW-AND-SYNC.md §7.2.
 */

const STEPS_AVEC_DEMARCHE: Step[] = [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

function notConfigured(step: Step): DemarcheSante {
  return {
    step,
    demarcheNumber: null,
    title: null,
    state: null,
    status: DemarcheSanteStatus.NON_CONFIGUREE,
    errorDetail: null,
  };
}

async function checkOne(step: Step): Promise<DemarcheSante> {
  let demarcheNumber: number | null = null;
  try {
    const id = prefillClient.getDemarcheId(step);
    demarcheNumber = id ? Number(id) : null;
  } catch {
    return notConfigured(step);
  }

  if (!demarcheNumber || Number.isNaN(demarcheNumber)) {
    return notConfigured(step);
  }

  try {
    const demarche = await graphqlClient.getDemarcheDetailed(demarcheNumber);
    if (!demarche) {
      // DN ne connaît pas ce numéro : démarche pas (encore) créée. Pas une erreur bloquante.
      return {
        step,
        demarcheNumber,
        title: null,
        state: null,
        status: DemarcheSanteStatus.NON_DISPONIBLE,
        errorDetail: null,
      };
    }
    return {
      step,
      demarcheNumber,
      title: demarche.title ?? null,
      state: demarche.state ?? null,
      status: demarche.state === "publiee" ? DemarcheSanteStatus.PUBLIEE : DemarcheSanteStatus.NON_PUBLIEE,
      errorDetail: null,
    };
  } catch (error) {
    return {
      step,
      demarcheNumber,
      title: null,
      state: null,
      status: DemarcheSanteStatus.ERREUR,
      errorDetail: error instanceof Error ? error.message : "Erreur API DN",
    };
  }
}

export async function getDemarchesSante(): Promise<DemarcheSante[]> {
  return Promise.all(STEPS_AVEC_DEMARCHE.map(checkOne));
}
