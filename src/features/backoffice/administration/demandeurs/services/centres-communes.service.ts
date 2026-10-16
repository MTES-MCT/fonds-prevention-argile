import { unstable_cache } from "next/cache";
import { fetchCentresCommunesDepartement, type GeoCentreCommune } from "@/shared/adapters/geo";
import { codeDepartementDeCommune, type CentresCommunes } from "../domain/carte-communes.utils";

// Le découpage communal ne bouge qu'au 1er janvier.
const REVALIDATE_SECONDS = 30 * 24 * 60 * 60;

// Une erreur levée n'est pas mise en cache : le département sera redemandé au prochain affichage.
const getCentresDepartement = (codeDepartement: string): Promise<GeoCentreCommune[]> =>
  unstable_cache(
    () => fetchCentresCommunesDepartement(codeDepartement),
    ["geo-centres-communes", "v1", codeDepartement],
    {
      revalidate: REVALIDATE_SECONDS,
    }
  )();

export interface ResultatCentresCommunes {
  centres: CentresCommunes;
  /** Départements dont les centres n'ont pas pu être lus : leurs communes ne sont pas placées. */
  departementsEnEchec: string[];
}

export async function getCentresCommunes(codesCommunes: string[]): Promise<ResultatCentresCommunes> {
  const demandes = new Set(codesCommunes);
  const departements = [...new Set(codesCommunes.map(codeDepartementDeCommune))].sort();

  const resultats = await Promise.allSettled(departements.map(getCentresDepartement));

  const centres: CentresCommunes = {};
  const departementsEnEchec: string[] = [];

  resultats.forEach((resultat, index) => {
    if (resultat.status === "rejected") {
      console.error(`[centres-communes] Département ${departements[index]} indisponible:`, resultat.reason);
      departementsEnEchec.push(departements[index]);
      return;
    }
    for (const commune of resultat.value) {
      if (demandes.has(commune.code)) centres[commune.code] = [commune.lon, commune.lat];
    }
  });

  return { centres, departementsEnEchec };
}
