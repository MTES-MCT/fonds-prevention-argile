import { describe, it, expect } from "vitest";
import {
  evaluateAgentSimulation,
  buildEligibiliteArchiveNote,
  isEligibiliteArchiveReason,
} from "./eligibilite-agent.service";
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

describe("isEligibiliteArchiveReason", () => {
  it("reconnaît les notes d'archivage pour inéligibilité (création / édition)", () => {
    expect(isEligibiliteArchiveReason(buildEligibiliteArchiveNote(null, "creation"))).toBe(true);
    expect(isEligibiliteArchiveReason(buildEligibiliteArchiveNote(null, "edition"))).toBe(true);
    // Aligné aussi sur la note de qualification prospect (« Non éligible au dispositif »).
    expect(isEligibiliteArchiveReason("Non éligible au dispositif")).toBe(true);
  });

  it("ignore un archivage manuel et les valeurs vides", () => {
    expect(isEligibiliteArchiveReason("Le demandeur a abandonné le projet")).toBe(false);
    expect(isEligibiliteArchiveReason("Reste à charge trop élevé")).toBe(false);
    expect(isEligibiliteArchiveReason(null)).toBe(false);
    expect(isEligibiliteArchiveReason(undefined)).toBe(false);
  });
});
