import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAleaByCoordinates } from "@/shared/services/rga";
import { limiterDebit } from "@/shared/services/limitation-debit/limitation-debit";

// Number() et non parseFloat : « 46.8;DROP » n'est pas un nombre. Les bornes écartent aussi l'infini.
const Coordonnees = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

/**
 * GET /api/rga/alea?lat=46.5&lon=1.8 : niveau d'aléa RGA d'un point (polygones RGA 2026, PostGIS).
 * Sans authentification : donnée géographique publique.
 */
export async function GET(request: NextRequest) {
  const refus = limiterDebit(request, "lecture");
  if (refus) return refus;

  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get("lat");
  const lonStr = searchParams.get("lon");

  if (!latStr || !lonStr) {
    return NextResponse.json({ error: "Parametres lat et lon requis" }, { status: 400 });
  }

  const coordonnees = Coordonnees.safeParse({ lat: latStr, lon: lonStr });
  if (!coordonnees.success) {
    return NextResponse.json({ error: "Parametres lat et lon invalides" }, { status: 400 });
  }

  const alea = await getAleaByCoordinates(coordonnees.data.lat, coordonnees.data.lon);

  return NextResponse.json({ alea });
}
