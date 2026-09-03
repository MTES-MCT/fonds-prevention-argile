import { describe, it, expect } from "vitest";
import { formatTracesResume } from "./agent-traces";
import type { AgentTracesCount } from "@/shared/database/repositories/agents.repository";

function traces(override: Partial<AgentTracesCount> = {}): AgentTracesCount {
  const base = {
    actions: 0,
    qualifications: 0,
    archivages: 0,
    dossiersCrees: 0,
    simulationsEditees: 0,
    ...override,
  };
  return {
    ...base,
    total: base.actions + base.qualifications + base.archivages + base.dossiersCrees + base.simulationsEditees,
  };
}

describe("formatTracesResume", () => {
  it("n'énumère que les sources non nulles, dans l'ordre", () => {
    expect(formatTracesResume(traces({ actions: 12, dossiersCrees: 5 }))).toBe("12 actions, 5 dossiers créés");
  });

  it("accorde le singulier", () => {
    expect(formatTracesResume(traces({ actions: 1, dossiersCrees: 1, simulationsEditees: 1 }))).toBe(
      "1 action, 1 dossier créé, 1 simulation modifiée"
    );
  });

  it("retourne une chaîne vide pour un agent sans historique", () => {
    expect(formatTracesResume(traces())).toBe("");
  });
});
