import { describe, expect, it } from "vitest";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import { extractUniqueDepartements } from "./departementFilter.utils";

function demandeur(codeDepartement: string | number): UserWithParcoursDetails {
  return { rgaSimulation: { logement: { code_departement: codeDepartement } } } as unknown as UserWithParcoursDetails;
}

describe("extractUniqueDepartements", () => {
  it("met les départements du fonds en tête, dans l'ordre du dispositif, sans ajouter ceux absents", () => {
    const users = [demandeur("75"), demandeur(82), demandeur("03"), demandeur("2A"), demandeur("13"), demandeur(3)];

    expect(extractUniqueDepartements(users)).toEqual(["3", "82", "13", "2A", "75"]);
  });
});
