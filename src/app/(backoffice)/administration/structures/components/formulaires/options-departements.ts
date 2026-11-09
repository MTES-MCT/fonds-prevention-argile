import { getDepartementName } from "@/shared/constants/departements.constants";
import { getAllDepartementsEligibles } from "@/shared/constants/rga.constants";
import type { OptionSelect } from "./SelectMultiple";

// Le fonds n'intervient que dans ces départements : un territoire n'a pas à en sortir.
export const OPTIONS_DEPARTEMENTS: OptionSelect[] = getAllDepartementsEligibles().map(({ code, nom }) => ({
  valeur: code,
  libelle: `${code} - ${nom}`,
}));

/** Un département déjà enregistré hors du dispositif reste nommé, et signalé. */
export function libelleDepartementHorsDispositif(code: string): string {
  return `${code} - ${getDepartementName(code)} (hors dispositif)`;
}
