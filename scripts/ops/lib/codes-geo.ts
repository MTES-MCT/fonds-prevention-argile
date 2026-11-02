import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";

const CHIFFRES = /^\d+$/;

/** Code numérique remis en chaîne sur `longueur` caractères ; un code non numérique (2A004) est laissé tel quel. */
function codeOfficiel(valeur: unknown, longueur: number): unknown {
  if (typeof valeur === "number") return String(valeur).padStart(longueur, "0");
  if (typeof valeur === "string" && CHIFFRES.test(valeur)) return valeur.padStart(longueur, "0");
  return valeur;
}

const NORMALISATIONS: Record<string, (valeur: unknown) => unknown> = {
  // Une chaîne vide reste vide : toOfficialCodeDepartement en ferait un faux département « 00 ».
  code_departement: (v) =>
    typeof v === "number" || (typeof v === "string" && v.trim() !== "") ? toOfficialCodeDepartement(v) : v,
  commune: (v) => codeOfficiel(v, 5),
  code_region: (v) => codeOfficiel(v, 2),
  epci: (v) => (typeof v === "number" ? String(v) : v),
};

export interface NormalisationCodesGeo<T> {
  simulation: T;
  /** Champs réellement modifiés, avec leur valeur avant/après. */
  changements: { champ: string; avant: unknown; apres: unknown }[];
}

/**
 * Remet les codes géographiques d'une simulation au format officiel (département « 03 »,
 * commune « 03023 », EPCI en chaîne). Les simulations de 2025 les stockent en nombres.
 */
export function normaliserCodesGeo<T>(simulation: T): NormalisationCodesGeo<T> {
  const logement = (simulation as { logement?: unknown } | null)?.logement;
  if (!logement || typeof logement !== "object") return { simulation, changements: [] };

  const nouveauLogement: Record<string, unknown> = { ...(logement as Record<string, unknown>) };
  const changements: NormalisationCodesGeo<T>["changements"] = [];

  for (const [champ, normaliser] of Object.entries(NORMALISATIONS)) {
    if (!(champ in nouveauLogement)) continue;
    const avant = nouveauLogement[champ];
    const apres = normaliser(avant);
    if (apres !== avant) {
      nouveauLogement[champ] = apres;
      changements.push({ champ, avant, apres });
    }
  }

  if (changements.length === 0) return { simulation, changements };
  return { simulation: { ...(simulation as object), logement: nouveauLogement } as T, changements };
}
