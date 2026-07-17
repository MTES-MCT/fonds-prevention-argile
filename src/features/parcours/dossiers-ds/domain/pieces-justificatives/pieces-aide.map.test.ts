import { describe, it, expect } from "vitest";
import { findAideForLabel, normalizeLabel } from "./pieces-aide.map";

describe("normalizeLabel", () => {
  it("passe en minuscules, retire les accents et compacte les espaces", () => {
    expect(normalizeLabel("  Pièce   d'Identité ")).toBe("piece d'identite");
  });
});

describe("findAideForLabel", () => {
  it("rattache l'avis d'imposition à impots.gouv", () => {
    const aide = findAideForLabel("Dernier avis d'imposition");
    expect(aide?.liens?.[0]?.href).toContain("impots.gouv.fr");
  });

  it("la pièce d'identité prime sur la règle mandat (ordre)", () => {
    const aide = findAideForLabel("Pièce d'identité du mandataire ou représentant légal");
    expect(aide?.texte).toContain("Carte nationale d'identité");
  });

  it("rattache le rapport de diagnostic au professionnel", () => {
    const aide = findAideForLabel("Rapport du diagnostic de vulnérabilité");
    expect(aide?.texte).toContain("professionnel");
  });

  it("rattache une facture à l'entreprise et un devis à l'AMO", () => {
    expect(findAideForLabel("Facture(s) acquittées")?.texte).toContain("entreprise");
    expect(findAideForLabel("Devis pour la phase étude")?.texte).toContain("AMO");
  });

  it("renvoie undefined pour un libellé sans règle", () => {
    expect(findAideForLabel("Numéro de téléphone")).toBeUndefined();
  });
});
