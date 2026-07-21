import { describe, it, expect } from "vitest";
import { evaluateAgentSimulation, buildEligibiliteArchiveNote } from "./eligibilite-agent.service";
import { EligibilityReason } from "@/features/simulateur/domain/value-objects/eligibility-reason.enum";

describe("evaluateAgentSimulation", () => {
  it("retourne un verdict neutre sans données", () => {
    const verdict = evaluateAgentSimulation(null);
    expect(verdict).toEqual({ result: null, isEligible: false, isNonEligible: false });
  });

  it("détecte la non-éligibilité (appartement) en early exit", () => {
    const verdict = evaluateAgentSimulation({ logement: { type: "appartement" } });
    expect(verdict.isNonEligible).toBe(true);
    expect(verdict.isEligible).toBe(false);
  });
});

describe("buildEligibiliteArchiveNote", () => {
  it("inclut le libellé de raison et distingue création / édition", () => {
    const creation = buildEligibiliteArchiveNote({ reason: EligibilityReason.APPARTEMENT } as never, "creation");
    const edition = buildEligibiliteArchiveNote({ reason: EligibilityReason.APPARTEMENT } as never, "edition");

    expect(creation).toContain("création");
    expect(edition).toContain("corrigée");
    expect(edition).toContain("—");
  });

  it("reste lisible sans raison", () => {
    expect(buildEligibiliteArchiveNote(null, "edition")).toBe("Non éligible (simulation corrigée par un agent)");
  });
});
