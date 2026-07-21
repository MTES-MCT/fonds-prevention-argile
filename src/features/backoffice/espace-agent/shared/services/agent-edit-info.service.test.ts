import { describe, it, expect, vi, beforeEach } from "vitest";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

vi.mock("@/shared/database/repositories/agents.repository", () => ({
  agentsRepository: {
    findById: vi.fn(async () => ({ id: "agent-1", givenName: "Alex", usualName: "Martin" })),
  },
}));

import { buildAgentEditInfo } from "./agent-edit-info.service";

const sim = (niveaux: number): RGASimulationData =>
  ({
    logement: { niveaux, zone_dexposition: "fort" },
    rga: {},
    menage: { personnes: 2, revenu_rga: 20000 },
  }) as unknown as RGASimulationData;

describe("buildAgentEditInfo — baseline snapshot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("diffe contre le baseline pour un dossier créé par agent (rgaSimulationData null)", async () => {
    const result = await buildAgentEditInfo({
      rgaSimulationData: null,
      rgaSimulationDataAgentBaseline: sim(1),
      rgaSimulationDataAgent: sim(4),
      rgaSimulationAgentEditedAt: new Date(),
      rgaSimulationAgentEditedBy: "agent-1",
    });

    expect(result).not.toBeNull();
    expect(result?.nombreModifications).toBe(1);
    expect(result?.originalDisplayValues.nombreNiveaux).toBe("1 NIVEAU");
  });

  it("retourne null sans baseline ni simulation demandeur (aucune référence)", async () => {
    const result = await buildAgentEditInfo({
      rgaSimulationData: null,
      rgaSimulationDataAgentBaseline: null,
      rgaSimulationDataAgent: sim(4),
      rgaSimulationAgentEditedAt: new Date(),
      rgaSimulationAgentEditedBy: "agent-1",
    });

    expect(result).toBeNull();
  });

  it("détecte un changement de mitoyenneté (critère absent de l'ancienne liste)", async () => {
    const base = { logement: { mitoyen: false }, rga: {}, menage: {} } as unknown as RGASimulationData;
    const edited = { logement: { mitoyen: true }, rga: {}, menage: {} } as unknown as RGASimulationData;

    const result = await buildAgentEditInfo({
      rgaSimulationData: null,
      rgaSimulationDataAgentBaseline: base,
      rgaSimulationDataAgent: edited,
      rgaSimulationAgentEditedAt: new Date(),
      rgaSimulationAgentEditedBy: "agent-1",
    });

    expect(result?.originalDisplayValues.mitoyennete).toBe("NON");
  });

  it("préfère le baseline à la simulation demandeur quand les deux existent", async () => {
    const result = await buildAgentEditInfo({
      rgaSimulationData: sim(2),
      rgaSimulationDataAgentBaseline: sim(1),
      rgaSimulationDataAgent: sim(3),
      rgaSimulationAgentEditedAt: new Date(),
      rgaSimulationAgentEditedBy: "agent-1",
    });

    // Diff calculé depuis le baseline (1 niveau), pas depuis la sim demandeur (2).
    expect(result?.originalDisplayValues.nombreNiveaux).toBe("1 NIVEAU");
  });
});
