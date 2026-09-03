import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentTracesCount } from "@/shared/database/repositories/agents.repository";

vi.mock("@/shared/database/repositories/agents.repository", () => ({
  agentsRepository: {
    countTraces: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/shared/database", () => ({
  agentPermissionsRepository: {},
  entreprisesAmoRepo: {},
  allersVersRepository: {},
}));

import { deleteAgent } from "./agents-admin.service";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";

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

describe("deleteAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("supprime un agent sans aucune trace", async () => {
    vi.mocked(agentsRepository.countTraces).mockResolvedValue(traces());
    vi.mocked(agentsRepository.delete).mockResolvedValue(true);

    expect(await deleteAgent("agent-1")).toBe(true);
    expect(agentsRepository.delete).toHaveBeenCalledWith("agent-1");
  });

  it("refuse la suppression et oriente vers la désactivation si l'agent a un historique", async () => {
    vi.mocked(agentsRepository.countTraces).mockResolvedValue(traces({ actions: 12, dossiersCrees: 5 }));

    await expect(deleteAgent("agent-1")).rejects.toThrow(/12 actions, 5 dossiers créés/);
    await expect(deleteAgent("agent-1")).rejects.toThrow(/désactivez-le à la place/);
    expect(agentsRepository.delete).not.toHaveBeenCalled();
  });

  it("refuse même sur une seule trace", async () => {
    vi.mocked(agentsRepository.countTraces).mockResolvedValue(traces({ qualifications: 1 }));

    await expect(deleteAgent("agent-1")).rejects.toThrow(/1 qualification/);
    expect(agentsRepository.delete).not.toHaveBeenCalled();
  });
});
