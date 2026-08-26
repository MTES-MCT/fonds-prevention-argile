"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { dsObservationsRepo, type ObservationAvecDemandeur } from "@/shared/database/repositories";
import { RESOLUTION_OBSERVATION, type ResolutionObservation } from "@/shared/database/schema";
import { reconcilierDemarche } from "@/features/parcours/dossiers-ds/services/reconciliation.service";
import { inspecterDossierDn } from "@/features/parcours/dossiers-ds/services/inspection.service";
import type { InspectionDossier } from "@/features/parcours/dossiers-ds/domain/types/inspection.types";
import { resolveDemarcheNumberForStep } from "@/features/parcours/dossiers-ds/services/pieces-justificatives.service";
import {
  VERDICTS_A_RATTACHER,
  VERDICTS_A_ARBITRER,
} from "@/features/backoffice/administration/diagnostics/domain/diagnostics.types";
import type { ActionResult } from "@/shared/types";

/**
 * Files de travail issues de la réconciliation (ADR-0027). Réservées au super-admin, comme le
 * reste de la page diagnostics : elles exposent des numéros de dossier et des noms.
 */

async function ensureSuperAdmin(): Promise<{ ok: true; agentId: string | null } | { ok: false; error: string }> {
  const agentResult = await getCurrentAgent();
  if (!agentResult.success) return { ok: false, error: agentResult.error };
  if (!isSuperAdminRole(agentResult.data.role)) {
    return { ok: false, error: "Accès réservé au super-administrateur" };
  }
  return { ok: true, agentId: agentResult.data.id };
}

export interface FilesReconciliation {
  aRattacher: ObservationAvecDemandeur[];
  aArbitrer: ObservationAvecDemandeur[];
  compteurs: Record<string, number>;
}

export async function listerFilesReconciliationAction(): Promise<ActionResult<FilesReconciliation>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const [aRattacher, aArbitrer, compteurs] = await Promise.all([
      dsObservationsRepo.listerOuvertes([...VERDICTS_A_RATTACHER]),
      dsObservationsRepo.listerOuvertes([...VERDICTS_A_ARBITRER]),
      dsObservationsRepo.compterOuvertesParVerdict(),
    ]);

    return { success: true, data: { aRattacher, aArbitrer, compteurs } };
  } catch (error) {
    console.error("Erreur listerFilesReconciliationAction:", error);
    return { success: false, error: "Erreur lors du chargement des files" };
  }
}

/** Étapes balayables : celles qui ont une démarche DN réellement configurée. */
const STEPS_RECONCILIABLES = [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS];

export interface ResultatAnalyse {
  step: Step;
  examines: number;
  scanComplet: boolean;
  raison?: string;
  totaux: Record<string, number>;
}

/**
 * Balaye une démarche en LECTURE SEULE et remplit les files. N'applique aucun rattachement :
 * l'écriture reste explicite, via le script ops (ADR-0027).
 */
export async function analyserReconciliationAction(step: Step): Promise<ActionResult<ResultatAnalyse>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  if (!STEPS_RECONCILIABLES.includes(step)) {
    return { success: false, error: "Cette étape n'a pas de démarche à balayer." };
  }

  try {
    const rapport = await reconcilierDemarche({
      demarcheNumber: resolveDemarcheNumberForStep(step),
      step,
      apply: false,
    });

    revalidatePath("/administration/diagnostics");

    return {
      success: true,
      data: {
        step,
        examines: rapport.lignes.length,
        scanComplet: rapport.scanComplet,
        raison: rapport.scanIncompletRaison,
        totaux: rapport.totaux,
      },
    };
  } catch (error) {
    console.error("Erreur analyserReconciliationAction:", error);
    return { success: false, error: "Erreur lors de l'analyse des dossiers DN" };
  }
}

/**
 * Rapproche un dossier DN des demandeurs connus, pour épargner l'enquête à la main.
 * Lecture seule : aucun rattachement n'est fait ici.
 */
export async function inspecterDossierDnAction(dsNumber: string): Promise<ActionResult<InspectionDossier>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  if (!/^\d+$/.test(dsNumber)) {
    return { success: false, error: "Numéro de dossier invalide" };
  }

  try {
    const inspection = await inspecterDossierDn(dsNumber);
    if (!inspection) {
      return { success: false, error: "Ce dossier n'est plus accessible côté Démarches Numériques." };
    }
    return { success: true, data: inspection };
  } catch (error) {
    console.error("Erreur inspecterDossierDnAction:", error);
    return { success: false, error: "Erreur lors de l'inspection du dossier" };
  }
}

/** Referme un cas traité à la main : arbitré ou écarté. */
export async function resoudreObservationAction(
  dsNumber: string,
  resolution: ResolutionObservation
): Promise<ActionResult<void>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  // `auto` est réservé aux balayages : un humain arbitre ou écarte, il ne « referme » pas.
  const resolutionsManuelles: ResolutionObservation[] = [
    RESOLUTION_OBSERVATION.ARBITRE,
    RESOLUTION_OBSERVATION.ECARTE,
    RESOLUTION_OBSERVATION.RATTACHE,
  ];
  if (!resolutionsManuelles.includes(resolution)) {
    return { success: false, error: "Résolution inconnue" };
  }

  try {
    await dsObservationsRepo.resoudre(dsNumber, resolution, guard.agentId);
    revalidatePath("/administration/diagnostics");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Erreur resoudreObservationAction:", error);
    return { success: false, error: "Erreur lors de la résolution" };
  }
}
