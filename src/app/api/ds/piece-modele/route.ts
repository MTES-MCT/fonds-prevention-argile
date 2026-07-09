import { NextResponse, type NextRequest } from "next/server";
import {
  getConfiguredDemarcheNumbers,
  getFreshModeleUrl,
} from "@/features/parcours/dossiers-ds/services/pieces-justificatives.service";

// La cible est une URL temporaire DN régénérée à chaque appel : jamais de cache.
export const dynamic = "force-dynamic";

/**
 * GET /api/ds/piece-modele?demarche=<n>&champ=<id>
 *
 * Régénère l'URL temporaire (fileTemplate) du modèle de pièce côté DN et redirige
 * dessus. Les liens DN sont des Swift TempURL signées qui expirent vite : les servir
 * depuis un cache renvoie « Unauthorized temp url invalide ». La cible du 302 provient
 * de DN (pas de l'entrée utilisateur) et la démarche est restreinte à la whitelist
 * configurée → pas d'open redirect.
 *
 * Modèles publics (CERFA, attestations vierges) : pas d'authentification requise.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const demarcheStr = searchParams.get("demarche");
  const champId = searchParams.get("champ");

  if (!demarcheStr || !champId) {
    return NextResponse.json({ error: "Paramètres demarche et champ requis" }, { status: 400 });
  }

  const demarcheNumber = parseInt(demarcheStr, 10);
  if (Number.isNaN(demarcheNumber) || !getConfiguredDemarcheNumbers().has(demarcheNumber)) {
    return NextResponse.json({ error: "Démarche inconnue" }, { status: 400 });
  }

  const url = await getFreshModeleUrl(demarcheNumber, champId);
  if (!url) {
    return NextResponse.json({ error: "Modèle introuvable" }, { status: 404 });
  }

  return new NextResponse(null, {
    status: 302,
    headers: { Location: url, "Cache-Control": "no-store" },
  });
}
