import { DEPARTEMENTS_OFFICIELS } from "@/features/backoffice";
import type { OptionSelect } from "./SelectMultiple";

export const OPTIONS_DEPARTEMENTS: OptionSelect[] = DEPARTEMENTS_OFFICIELS.map(({ code, nom }) => ({
  valeur: code,
  libelle: `${code} - ${nom}`,
}));
