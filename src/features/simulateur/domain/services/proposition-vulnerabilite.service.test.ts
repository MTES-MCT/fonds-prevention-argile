import { describe, expect, it } from "vitest";
import { createInitialChecks } from "../entities/eligibility-result.entity";
import { peutProposerVulnerabilite } from "./proposition-vulnerabilite.service";

describe("peutProposerVulnerabilite", () => {
  it("propose le test quand un autre critère fait échouer l'éligibilité", () => {
    expect(peutProposerVulnerabilite({ ...createInitialChecks(), maison: true, zoneForte: false })).toBe(true);
  });

  it("ne le propose pas pour un appartement", () => {
    expect(peutProposerVulnerabilite({ ...createInitialChecks(), maison: false })).toBe(false);
  });

  it("ne le propose pas à un non-propriétaire occupant", () => {
    expect(peutProposerVulnerabilite({ ...createInitialChecks(), maison: true, proprietaireOccupant: false })).toBe(
      false
    );
  });
});
