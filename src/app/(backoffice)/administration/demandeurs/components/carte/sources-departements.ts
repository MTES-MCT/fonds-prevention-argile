import type * as maplibregl from "maplibre-gl";
import { repartirParDepartement, type CarteCommunes } from "@/features/backoffice/administration/demandeurs/domain";
import { OPTIONS_SOURCE, couchesDemandeurs, couchesSource, sourceDemandeurs } from "./carte-demandeurs.style";

type CarteSources = Pick<
  maplibregl.Map,
  "getLayer" | "removeLayer" | "getSource" | "removeSource" | "addSource" | "addLayer"
>;

/** Pose une source par département présent et retire celles des départements sortis du filtre. */
export function synchroniserSources(map: CarteSources, carte: CarteCommunes, actives: Set<string>) {
  const parDepartement = repartirParDepartement(carte);
  const voulues = new Set([...parDepartement.keys()].map(sourceDemandeurs));

  for (const source of actives) {
    if (voulues.has(source)) continue;
    Object.values(couchesDemandeurs(source)).forEach((couche) => map.getLayer(couche) && map.removeLayer(couche));
    if (map.getSource(source)) map.removeSource(source);
    actives.delete(source);
  }

  for (const [departement, donnees] of parDepartement) {
    const source = sourceDemandeurs(departement);
    const existante = map.getSource<maplibregl.GeoJSONSource>(source);
    if (existante) {
      existante.setData(donnees);
      continue;
    }
    map.addSource(source, { ...OPTIONS_SOURCE, data: donnees });
    couchesSource(source).forEach((couche) => map.addLayer(couche));
    actives.add(source);
  }
}

export function couchesCliquables(actives: Set<string>): string[] {
  return [...actives].flatMap((source) => {
    const ids = couchesDemandeurs(source);
    return [ids.groupes, ids.communes];
  });
}
