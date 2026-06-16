"use server";

import { checkAgentAccess } from "@/features/auth";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import type { ActionResult } from "@/shared/types";
import { detectAnomalies } from "../services/diagnostics.service";
import { getDemarchesSante } from "../services/demarches-sante.service";
import {
  getParcoursDiagnosticDetail,
  searchEligibiliteByEmail,
  type ParcoursDiagnosticDetail,
  type DsEmailHit,
} from "../services/diagnostics-detail.service";
import type { AnomaliesResult, DemarcheSante } from "../domain/diagnostics.types";

/**
 * Server actions de la vue de diagnostic data (réservée SUPER_ADMINISTRATEUR).
 */

async function ensureSuperAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await checkAgentAccess();
  if (!access.hasAccess || !access.user?.role) {
    return { ok: false, error: "Non authentifié" };
  }
  if (!isSuperAdminRole(access.user.role)) {
    return { ok: false, error: "Accès réservé aux super-administrateurs" };
  }
  return { ok: true };
}

/** Liste des parcours en anomalie, détectés EN BASE (aucun appel DS). */
export async function listAnomaliesAction(): Promise<ActionResult<AnomaliesResult>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const result = await detectAnomalies();
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur listAnomaliesAction:", error);
    return { success: false, error: "Erreur lors de la détection des anomalies" };
  }
}

/** Santé des démarches DS (cross-check live léger : publiée ?). */
export async function getDemarchesSanteAction(): Promise<ActionResult<DemarcheSante[]>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const result = await getDemarchesSante();
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur getDemarchesSanteAction:", error);
    return { success: false, error: "Erreur lors du contrôle des démarches" };
  }
}

/** Cross-check DS live d'un parcours : état local vs état réel DS + explication métier. */
export async function getParcoursDiagnosticDetailAction(
  parcoursId: string
): Promise<ActionResult<ParcoursDiagnosticDetail>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const detail = await getParcoursDiagnosticDetail(parcoursId);
    if (!detail) return { success: false, error: "Parcours introuvable" };
    return { success: true, data: detail };
  } catch (error) {
    console.error("Erreur getParcoursDiagnosticDetailAction:", error);
    return { success: false, error: "Erreur lors du cross-check DS" };
  }
}

/** Recherche (coûteuse) du dossier éligibilité par email côté DS, pour un parcours orphelin. */
export async function searchEligibiliteByEmailAction(
  parcoursId: string
): Promise<ActionResult<{ hits: DsEmailHit[]; capped: boolean }>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const result = await searchEligibiliteByEmail(parcoursId);
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur searchEligibiliteByEmailAction:", error);
    return { success: false, error: "Erreur lors de la recherche par email" };
  }
}
