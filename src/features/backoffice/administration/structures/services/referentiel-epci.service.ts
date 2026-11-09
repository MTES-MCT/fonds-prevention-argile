import { unstable_cache } from "next/cache";
import { fetchEpcis } from "@/shared/adapters/geo";
import type { EpciReferentiel } from "../domain/regles-structures";

// Les EPCI changent au 1er janvier ; ≈ 100 Ko, sous la limite de 2 Mo du cache de Next. Un échec lève, donc n'est pas mis en cache.
const epcisEnCache = unstable_cache(fetchEpcis, ["geo-epcis", "v1"], { revalidate: 24 * 60 * 60 });

/** Tous les EPCI de France, triés par nom. */
export async function listerEpcis(): Promise<EpciReferentiel[]> {
  const epcis = await epcisEnCache();
  return [...epcis].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}
