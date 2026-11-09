import { describe, expect, it } from "vitest";
import { categorizeDoubleProgression } from "./double-progression";

describe("categorizeDoubleProgression", () => {
  it("laisse en paix un parcours qui a un dossier d'éligibilité", () => {
    expect(categorizeDoubleProgression([{ step: "eligibilite", dsStatus: "accepte" }])).toBe("legitime");
  });

  it("régresse simplement un parcours sans aucun dossier", () => {
    expect(categorizeDoubleProgression([])).toBe("regressable");
  });

  it("ne nettoie que des brouillons jamais déposés (statut DS nul)", () => {
    expect(categorizeDoubleProgression([{ step: "diagnostic", dsStatus: null }])).toBe("cleanup_requis");
  });

  it("ne nettoie jamais un dossier en construction, déposé depuis ADR-0009", () => {
    expect(
      categorizeDoubleProgression([
        { step: "diagnostic", dsStatus: null },
        { step: "devis", dsStatus: "en_construction" },
      ])
    ).toBe("a_reviewer");
  });
});
