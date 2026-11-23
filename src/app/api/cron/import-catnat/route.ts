import { NextRequest, NextResponse, after } from "next/server";
import { getServerEnv } from "@/shared/config/env.config";
import { catnatService } from "@/features/seo/catnat/services/catnat.service";
import { bearerCorrespond } from "@/shared/utils/crypto.utils";

// Endpoint CRON déclenché par GitHub Actions : 202 immédiat + import via after() (proxy Scalingo ~55s). Bilan dans les logs.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function verifyBearerToken(request: NextRequest): boolean {
  const expected = getServerEnv().CRON_SECRET;
  if (!expected) console.error("[CRON import-catnat] CRON_SECRET non configuré");
  return bearerCorrespond(request.headers.get("authorization"), expected);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyBearerToken(request)) {
    return NextResponse.json({ success: false, error: "Authentification invalide" }, { status: 401 });
  }

  after(async () => {
    try {
      const bilan = await catnatService.importerCocon();
      const ligne = `[CRON import-catnat] communes=${bilan.totalCommunes} echecs=${bilan.communesFailed} lignes=${bilan.catnatImported} ajoutees=${bilan.lignesAjoutees}`;

      // Un lot en échec laisse des communes sans leurs derniers arrêtés : il doit ressortir dans les logs.
      if (bilan.communesFailed > 0) console.error(`${ligne} erreur="${bilan.errors[0]?.error}"`);
      else console.log(ligne);
    } catch (error) {
      console.error("[CRON import-catnat] Erreur (background):", error);
    }
  });

  return NextResponse.json(
    { success: true, accepted: true, message: "Import des catastrophes naturelles lancé en arrière-plan." },
    { status: 202 }
  );
}
