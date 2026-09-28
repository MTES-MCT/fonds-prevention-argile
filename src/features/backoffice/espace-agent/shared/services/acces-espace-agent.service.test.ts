import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/features/auth/permissions/services/permissions.service", () => ({ checkProConnectAccess: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/shared/database/repositories/agent-permissions.repository", () => ({
  agentPermissionsRepository: { getDepartementsByAgentId: vi.fn() },
}));

import { evaluerAccesEspaceAgent, exigerAccesEspaceAgent } from "./acces-espace-agent.service";
import { checkProConnectAccess } from "@/features/auth/permissions/services/permissions.service";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { agentPermissionsRepository } from "@/shared/database/repositories/agent-permissions.repository";

function connecteEnAgent(role: UserRole, departements: string[] = []) {
  vi.mocked(checkProConnectAccess).mockResolvedValue({ hasAccess: true } as never);
  vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: { id: "agent-1", role } } as never);
  vi.mocked(agentPermissionsRepository.getDepartementsByAgentId).mockResolvedValue(departements);
}

describe("evaluerAccesEspaceAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non authentifié → non_connecte, sans chercher l'agent", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({
      hasAccess: false,
      errorCode: "NOT_AUTHENTICATED",
    } as never);

    expect(await evaluerAccesEspaceAgent()).toEqual({ statut: "non_connecte" });
    expect(getCurrentAgent).not.toHaveBeenCalled();
  });

  it("session FranceConnect → methode_invalide", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({
      hasAccess: false,
      errorCode: "WRONG_AUTH_METHOD",
    } as never);

    expect(await evaluerAccesEspaceAgent()).toEqual({ statut: "methode_invalide" });
  });

  it("agent absent de la base → agent_inconnu", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({ hasAccess: true } as never);
    vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "x" } as never);

    expect(await evaluerAccesEspaceAgent()).toEqual({ statut: "agent_inconnu" });
  });

  it.each([UserRole.ADMINISTRATEUR, UserRole.PARTICULIER])("%s → role_refuse", async (role) => {
    connecteEnAgent(role);

    expect(await evaluerAccesEspaceAgent()).toEqual({ statut: "role_refuse" });
  });

  it("ANALYSTE sans département → analyste_national", async () => {
    connecteEnAgent(UserRole.ANALYSTE, []);

    expect(await evaluerAccesEspaceAgent()).toEqual({ statut: "analyste_national" });
  });

  it.each([
    [UserRole.AMO, []],
    [UserRole.ALLERS_VERS, []],
    [UserRole.AMO_ET_ALLERS_VERS, []],
    [UserRole.SUPER_ADMINISTRATEUR, []],
    [UserRole.ANALYSTE, ["30"]],
  ])("%s → autorise", async (role, departements) => {
    connecteEnAgent(role, departements);

    const acces = await evaluerAccesEspaceAgent();
    expect(acces.statut).toBe("autorise");
  });
});

describe("exigerAccesEspaceAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("autorisé → renvoie l'agent", async () => {
    connecteEnAgent(UserRole.AMO);

    await expect(exigerAccesEspaceAgent()).resolves.toMatchObject({ id: "agent-1", role: UserRole.AMO });
  });

  it("non authentifié → redirige vers la connexion agent", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({
      hasAccess: false,
      errorCode: "NOT_AUTHENTICATED",
    } as never);

    await expect(exigerAccesEspaceAgent()).rejects.toThrow("REDIRECT:/connexion/agent");
  });

  it("analyste national → redirige vers l'administration", async () => {
    connecteEnAgent(UserRole.ANALYSTE, []);

    await expect(exigerAccesEspaceAgent()).rejects.toThrow("REDIRECT:/administration");
  });

  it("ADMINISTRATEUR → 404 (le layout affiche le refus, la page ne produit rien)", async () => {
    connecteEnAgent(UserRole.ADMINISTRATEUR);

    await expect(exigerAccesEspaceAgent()).rejects.toThrow("NOT_FOUND");
  });

  it("session FranceConnect → 404", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({
      hasAccess: false,
      errorCode: "WRONG_AUTH_METHOD",
    } as never);

    await expect(exigerAccesEspaceAgent()).rejects.toThrow("NOT_FOUND");
  });
});
