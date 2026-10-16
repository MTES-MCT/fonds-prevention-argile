import { unstable_cache } from "next/cache";
import { fetchContoursDepartements, type GeoContourDepartement } from "@/shared/adapters/geo";
import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";

const REVALIDATE_SECONDS = 30 * 24 * 60 * 60;

// Une seule entrée pour toute la France (≈ 340 Ko, sous la limite de 2 Mo du cache de Next).
const getContoursDepartements = unstable_cache(fetchContoursDepartements, ["geo-contours-departements", "v1"], {
  revalidate: REVALIDATE_SECONDS,
});

/** Contour du département, ou `null` s'il est inconnu du référentiel. */
export async function getContourDepartement(codeDepartement: string): Promise<GeoContourDepartement | null> {
  const contours = await getContoursDepartements();
  return contours[toOfficialCodeDepartement(codeDepartement)] ?? null;
}
