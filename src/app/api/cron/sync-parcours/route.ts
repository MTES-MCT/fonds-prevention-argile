import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/shared/config/env.config";
import { runSyncBatch } from "@/features/parcours/dossiers-ds/services/parcours-sync-batch.service";
import { SyncRunTrigger } from "@/shared/domain/value-objects/sync-run-status.enum";
import { safeTokenEquals } from "@/shared/utils/crypto.utils";

/**
 * Endpoint CRON de synchronisation des parcours.
 *
 * Déclenché par le Scheduler Scalingo via :
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/sync-parcours
 *
 * - Itère tous les parcours actifs
 * - Synchronise leurs dossiers DS
 * - Fait progresser le parcours quand un dossier est accepté
 * - Enregistre l'historique du run dans `sync_runs` / `sync_run_entries`
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min, ajustable selon le volume

function verifyBearerToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") return false;

  const expected = getServerEnv().CRON_SECRET;
  if (!expected) {
    console.error("[CRON sync-parcours] CRON_SECRET non configuré");
    return false;
  }

  return safeTokenEquals(parts[1], expected);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyBearerToken(request)) {
    return NextResponse.json({ success: false, error: "Authentification invalide" }, { status: 401 });
  }

  try {
    const result = await runSyncBatch(SyncRunTrigger.CRON);

    if (result.skipped) {
      console.log(`[CRON sync-parcours] skipped: ${result.reason}`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: result.reason,
        existingRunId: result.existingRunId,
      });
    }

    console.log(
      `[CRON sync-parcours] runId=${result.runId} status=${result.status} scanned=${result.totalScanned} updated=${result.totalUpdated} errors=${result.totalErrors}`
    );

    return NextResponse.json({
      success: true,
      skipped: false,
      runId: result.runId,
      status: result.status,
      totals: {
        scanned: result.totalScanned,
        updated: result.totalUpdated,
        errors: result.totalErrors,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    console.error("[CRON sync-parcours] Erreur:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
