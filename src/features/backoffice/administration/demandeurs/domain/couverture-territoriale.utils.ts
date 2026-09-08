import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";
import { asString } from "@/shared/utils";

/**
 * Vrai si le département du demandeur fait partie des départements du dispositif
 * qu'aucune structure ne couvre (cf. `getDepartementsNonCouverts`).
 *
 * Les deux côtés sont normalisés : `code_departement` vient d'une colonne JSONB, où la
 * valeur peut arriver en nombre (`3`) ou sans zéro initial, alors que la liste est en
 * codes officiels (`"03"`).
 */
export function estDepartementNonCouvert(codeDepartement: unknown, departementsNonCouverts: string[]): boolean {
  const code = asString(codeDepartement)?.trim();
  if (!code) return false;

  const normalise = normalizeCodeDepartement(code);
  return departementsNonCouverts.some((d) => normalizeCodeDepartement(d) === normalise);
}
