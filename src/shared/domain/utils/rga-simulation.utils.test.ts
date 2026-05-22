import { describe, it, expect } from "vitest";
import {
  getDemandeurFirstSimulation,
  getAgentFirstSimulation,
  hasAnySimulation,
  getDemandeurFirstLogement,
} from "./rga-simulation.utils";
import type { RGASimulationData } from "../types/rga-simulation.types";

const userSim = {
  logement: { commune_nom: "Châteauroux", code_departement: "36" },
} as unknown as RGASimulationData;

const agentSim = {
  logement: { commune_nom: "Issoudun", code_departement: "36" },
} as unknown as RGASimulationData;

describe("getDemandeurFirstSimulation", () => {
  it("retourne la sim user quand les deux sont présentes (user prime)", () => {
    expect(getDemandeurFirstSimulation({ rgaSimulationData: userSim, rgaSimulationDataAgent: agentSim })).toBe(userSim);
  });

  it("retourne agent en fallback si user absente", () => {
    expect(getDemandeurFirstSimulation({ rgaSimulationData: null, rgaSimulationDataAgent: agentSim })).toBe(agentSim);
  });

  it("retourne user si agent absente", () => {
    expect(getDemandeurFirstSimulation({ rgaSimulationData: userSim, rgaSimulationDataAgent: null })).toBe(userSim);
  });

  it("retourne null si les deux sont absentes", () => {
    expect(getDemandeurFirstSimulation({ rgaSimulationData: null, rgaSimulationDataAgent: null })).toBeNull();
  });
});

describe("getAgentFirstSimulation", () => {
  it("retourne la sim agent quand les deux sont présentes (agent prime)", () => {
    expect(getAgentFirstSimulation({ rgaSimulationData: userSim, rgaSimulationDataAgent: agentSim })).toBe(agentSim);
  });

  it("retourne user en fallback si agent absente", () => {
    expect(getAgentFirstSimulation({ rgaSimulationData: userSim, rgaSimulationDataAgent: null })).toBe(userSim);
  });

  it("retourne null si les deux sont absentes", () => {
    expect(getAgentFirstSimulation({ rgaSimulationData: null, rgaSimulationDataAgent: null })).toBeNull();
  });
});

describe("hasAnySimulation", () => {
  it.each([
    [userSim, agentSim, true],
    [userSim, null, true],
    [null, agentSim, true],
    [null, null, false],
  ])(
    "user=%o, agent=%o → %s",
    (rgaSimulationData, rgaSimulationDataAgent, expected) => {
      expect(hasAnySimulation({ rgaSimulationData, rgaSimulationDataAgent })).toBe(expected);
    }
  );
});

describe("getDemandeurFirstLogement", () => {
  it("extrait logement.commune_nom de la sim user en priorité", () => {
    const result = getDemandeurFirstLogement({ rgaSimulationData: userSim, rgaSimulationDataAgent: agentSim });
    expect(result?.commune_nom).toBe("Châteauroux");
  });

  it("fallback agent quand user absente", () => {
    const result = getDemandeurFirstLogement({ rgaSimulationData: null, rgaSimulationDataAgent: agentSim });
    expect(result?.commune_nom).toBe("Issoudun");
  });

  it("null si les deux sims sont absentes", () => {
    expect(getDemandeurFirstLogement({ rgaSimulationData: null, rgaSimulationDataAgent: null })).toBeNull();
  });
});
