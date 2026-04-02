import { NextResponse, type NextRequest } from "next/server";
import { getAleaByCoordinates } from "@/shared/services/rga";

/**
 * GET /api/rga/alea?lat=46.5&lon=1.8
 *
 * Retourne le niveau d'alea RGA pour des coordonnees donnees
 * via requete spatiale PostGIS sur les polygones RGA 2026 importes.
 *
 * Pas d'authentification requise (donnees geographiques publiques).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "Parametres lat et lon requis" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "Parametres lat et lon invalides" }, { status: 400 });
  }

  const alea = await getAleaByCoordinates(lat, lon);

  return NextResponse.json({ alea });
}
