import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

vi.mock("@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service", () => ({
  evaluerAccesEspaceAgent: vi.fn(),
  REFUS_ACCES_ESPACE_AGENT: "Accès réservé aux agents de l'espace agent",
}));
vi.mock("./agent.actions", () => ({ getCurrentAgent: vi.fn() }));

import { resolveEspaceAgentAccess } from "./super-admin-access";
import { evaluerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";

function verdict(value: unknown) {
  vi.mocked(evaluerAccesEspaceAgent).mockResolvedValue(value as never);
}

// Porte d'entrée des listings (dossiers, compteur, accueil AMO) : un admin national en était exclu en théorie seulement.
describe("resolveEspaceAgentAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["role_refuse", "analyste_national", "non_connecte", "methode_invalide", "agent_inconnu"])(
    "verdict %s → erreur, aucun agent exposé",
    async (statut) => {
      verdict({ statut });

      expect(await resolveEspaceAgentAccess()).toEqual({
        kind: "error",
        error: "Accès réservé aux agents de l'espace agent",
      });
    }
  );

  it("agent métier autorisé → kind agent", async () => {
    verdict({ statut: "autorise", agent: { id: "a1", role: UserRole.AMO } });

    expect(await resolveEspaceAgentAccess()).toMatchObject({ kind: "agent", agent: { id: "a1" } });
  });

  it("super-admin autorisé → kind super-admin", async () => {
    verdict({ statut: "autorise", agent: { id: "a1", role: UserRole.SUPER_ADMINISTRATEUR } });

    expect(await resolveEspaceAgentAccess()).toMatchObject({ kind: "super-admin" });
  });
});
