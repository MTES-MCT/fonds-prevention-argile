import { NextRequest, NextResponse, after } from "next/server";
import { getServerEnv } from "@/shared/config/env.config";
import { runSyncBatch } from "@/features/parcours/dossiers-ds/services/parcours-sync-batch.service";
import { SyncRunTrigger } from "@/shared/domain/value-objects/sync-run-status.enum";
import { safeTokenEquals } from "@/shared/utils/crypto.utils";

// Endpoint CRON déclenché par GitHub Actions : 202 immédiat + run via after() (proxy Scalingo ~55s). Suivi : /administration/synchronisations.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  // Run en background : réponse part vite, traitement continue.
  after(async () => {
    try {
      const result = await runSyncBatch(SyncRunTrigger.CRON);

      if (result.skipped) {
        console.log(`[CRON sync-parcours] skipped: ${result.reason}`);
        return;
      }

      console.log(
        `[CRON sync-parcours] runId=${result.runId} status=${result.status} scanned=${result.totalScanned} updated=${result.totalUpdated} errors=${result.totalErrors}`
      );
    } catch (error) {
      console.error("[CRON sync-parcours] Erreur (background):", error);
    }
  });

  return NextResponse.json(
    { success: true, accepted: true, message: "Synchronisation lancée en arrière-plan." },
    { status: 202 }
  );
}
