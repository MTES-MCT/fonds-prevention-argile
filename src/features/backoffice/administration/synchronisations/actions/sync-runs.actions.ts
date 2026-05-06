"use server";

import { revalidatePath } from "next/cache";
import { checkAgentAccess } from "@/features/auth";
import { isSuperAdminRole } from "@/shared/domain/value-objects/user-role.enum";
import { syncRunRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types";
import {
  runSyncBatch,
  type SyncRunResult,
} from "@/features/parcours/dossiers-ds/services/parcours-sync-batch.service";
import { SyncRunTrigger } from "@/shared/domain/value-objects/sync-run-status.enum";
import type { SyncRun } from "@/shared/database/schema/sync-runs";
import type { SyncRunDetail } from "@/shared/database/repositories/sync-run.repository";

/**
 * Server actions super-admin pour consulter et déclencher les synchros CRON.
 */

interface ListSyncRunsResult {
  data: SyncRun[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

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

export async function listSyncRunsAction(
  page = 1,
  pageSize = 20
): Promise<ActionResult<ListSyncRunsResult>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const result = await syncRunRepo.findRecent({ page, pageSize });
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur listSyncRunsAction:", error);
    return { success: false, error: "Erreur lors du chargement des synchros" };
  }
}

export async function getSyncRunDetailAction(runId: string): Promise<ActionResult<SyncRunDetail>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const detail = await syncRunRepo.findByIdWithEntries(runId);
    if (!detail) {
      return { success: false, error: "Synchro introuvable" };
    }
    return { success: true, data: detail };
  } catch (error) {
    console.error("Erreur getSyncRunDetailAction:", error);
    return { success: false, error: "Erreur lors du chargement du détail" };
  }
}

export async function triggerManualSyncAction(): Promise<ActionResult<SyncRunResult>> {
  const guard = await ensureSuperAdmin();
  if (!guard.ok) return { success: false, error: guard.error };

  try {
    const result = await runSyncBatch(SyncRunTrigger.MANUAL);
    revalidatePath("/administration/synchronisations");
    return { success: true, data: result };
  } catch (error) {
    console.error("Erreur triggerManualSyncAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur lors du déclenchement",
    };
  }
}
