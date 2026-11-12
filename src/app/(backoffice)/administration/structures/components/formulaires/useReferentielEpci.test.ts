import { describe, it, expect, vi } from "vitest";

vi.mock("@/features/backoffice", () => ({ getReferentielEpciAction: vi.fn() }));

import { optionsEpci } from "./useReferentielEpci";

const EPCIS = [
  { code: "200054781", nom: "CA Bourges Plus", codesDepartements: ["18"] },
  { code: "243600236", nom: "CC du Pays d'Issoudun", codesDepartements: ["36"] },
  { code: "200068872", nom: "CC Éguzon - Argenton", codesDepartements: ["36", "23"] },
];

describe("optionsEpci", () => {
  it("ne propose que les EPCI du dispositif, ceux des départements choisis d'abord", () => {
    const epcis = [{ code: "200071082", nom: "CA Montluçon Communauté", codesDepartements: ["03"] }, ...EPCIS];
    // Bourges est dans le Cher, hors du dispositif ; Éguzon touche l'Indre, il reste.
    expect(optionsEpci(epcis, ["36"]).map((option) => option.valeur)).toEqual(["243600236", "200068872", "200071082"]);
  });

  it("nomme chaque EPCI avec ses départements et le retrouve par son code SIREN", () => {
    expect(optionsEpci(EPCIS, [])[1]).toEqual({
      valeur: "200068872",
      libelle: "CC Éguzon - Argenton (36, 23)",
      motsCles: "200068872",
    });
  });
});
