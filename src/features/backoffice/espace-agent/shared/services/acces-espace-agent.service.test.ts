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

import {
  evaluerAccesEspaceAgent,
  exigerAccesEspaceAgent,
  refusAccesEspaceAgent,
  REFUS_ACCES_ESPACE_AGENT,
} from "./acces-espace-agent.service";
import { checkProConnectAccess } from "@/features/auth/permissions/services/permissions.service";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { agentPermissionsRepository } from "@/shared/database/repositories/agent-permissions.repository";

function connecteEnAgent(role: UserRole, departements: string[] = [], entrepriseAmoId: string | null = "amo-1") {
  vi.mocked(checkProConnectAccess).mockResolvedValue({ hasAccess: true } as never);
  vi.mocked(getCurrentAgent).mockResolvedValue({
    success: true,
    data: { id: "agent-1", role, entrepriseAmoId },
  } as never);
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

  it.each([UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS])("%s sans entreprise → amo_non_configure", async (role) => {
    connecteEnAgent(role, [], null);

    expect(await evaluerAccesEspaceAgent()).toEqual({ statut: "amo_non_configure" });
  });

  it("ALLERS_VERS sans entreprise → autorise (l'entreprise ne le concerne pas)", async () => {
    connecteEnAgent(UserRole.ALLERS_VERS, [], null);

    expect((await evaluerAccesEspaceAgent()).statut).toBe("autorise");
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

// Une server action reste appelable en POST direct : le refus doit tenir hors de toute page.
describe("refusAccesEspaceAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ADMINISTRATEUR → refus", async () => {
    connecteEnAgent(UserRole.ADMINISTRATEUR);

    expect(await refusAccesEspaceAgent()).toBe(REFUS_ACCES_ESPACE_AGENT);
  });

  it("AMO sans entreprise → refus", async () => {
    connecteEnAgent(UserRole.AMO, [], null);

    expect(await refusAccesEspaceAgent()).toBe(REFUS_ACCES_ESPACE_AGENT);
  });

  it("ANALYSTE national → refus", async () => {
    connecteEnAgent(UserRole.ANALYSTE, []);

    expect(await refusAccesEspaceAgent()).toBe(REFUS_ACCES_ESPACE_AGENT);
  });

  it("non authentifié → refus", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({
      hasAccess: false,
      errorCode: "NOT_AUTHENTICATED",
    } as never);

    expect(await refusAccesEspaceAgent()).toBe(REFUS_ACCES_ESPACE_AGENT);
  });

  it.each([
    [UserRole.AMO, []],
    [UserRole.SUPER_ADMINISTRATEUR, []],
    [UserRole.ANALYSTE, ["30"]],
  ])("%s → aucun refus", async (role, departements) => {
    connecteEnAgent(role, departements);

    expect(await refusAccesEspaceAgent()).toBeNull();
  });
});
