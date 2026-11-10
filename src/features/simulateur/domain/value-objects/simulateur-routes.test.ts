import { describe, expect, it } from "vitest";
import { urlSimulateurEmbarque } from "./simulateur-routes";

describe("urlSimulateurEmbarque", () => {
  it("renvoie la version embarquée du simulateur", () => {
    expect(urlSimulateurEmbarque(null)).toBe("/embed-simulateur");
  });

  it("transmet le partenaire pour garder son suivi", () => {
    expect(urlSimulateurEmbarque("maisons-sans-fissures")).toBe("/embed-simulateur?partner=maisons-sans-fissures");
  });
});
