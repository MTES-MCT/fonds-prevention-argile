import { describe, it, expect, vi, beforeEach } from "vitest";
import EspaceAgentHomePage from "./page";
import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";

// redirect() de Next lève en réalité (NEXT_REDIRECT) : on le simule pour que
// l'exécution s'arrête au premier appel, comme en production.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service", () => ({
  exigerAccesEspaceAgent: vi.fn(),
}));

describe("EspaceAgentHomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("agent autorisé → redirige vers le listing des dossiers", async () => {
    vi.mocked(exigerAccesEspaceAgent).mockResolvedValue({ id: "agent-1" } as never);
    await expect(EspaceAgentHomePage()).rejects.toThrow("REDIRECT:/espace-agent/dossiers");
  });

  it("accès refusé → la garde interrompt avant toute redirection vers les dossiers", async () => {
    vi.mocked(exigerAccesEspaceAgent).mockRejectedValue(new Error("NOT_FOUND"));
    await expect(EspaceAgentHomePage()).rejects.toThrow("NOT_FOUND");
  });
});
