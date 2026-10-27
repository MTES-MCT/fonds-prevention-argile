import { asString } from "@/shared/utils";

export const PERIODES_CONSTRUCTION = ["avant_1948", "1948_1974", "1975_1989", "depuis_1990"] as const;

export type PeriodeConstruction = (typeof PERIODES_CONSTRUCTION)[number];

export const LIBELLES_PERIODE_CONSTRUCTION: Record<PeriodeConstruction, string> = {
  avant_1948: "Avant 1948",
  "1948_1974": "De 1948 à 1974",
  "1975_1989": "De 1975 à 1989",
  depuis_1990: "1990 et après",
};

// Bornes sans chevauchement : 1948, 1975 et 1990 ouvrent chacune leur période.
export function periodeConstruction(anneeDeConstruction: unknown): PeriodeConstruction | null {
  const valeur = asString(anneeDeConstruction)?.trim() ?? "";
  if (!/^\d{4}$/.test(valeur)) return null;

  const annee = Number(valeur);
  if (annee < 1948) return "avant_1948";
  if (annee < 1975) return "1948_1974";
  if (annee < 1990) return "1975_1989";
  return "depuis_1990";
}
