import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

// redirect() de Next lève (NEXT_REDIRECT) : on le simule pour stopper l'exécution.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/features/auth", () => ({
  checkProConnectAccess: vi.fn(),
  checkRoleAccess: vi.fn(),
  ROUTES: {
    connexion: { agent: "/connexion/agent" },
    backoffice: { administration: { root: "/administration" } },
  },
}));

vi.mock("@/features/backoffice", () => ({
  getCurrentAgent: vi.fn(),
  isCurrentUserSuperAdmin: vi.fn(),
}));

vi.mock("@/shared/database", () => ({
  agentPermissionsRepository: { getDepartementsByAgentId: vi.fn() },
}));

// Stubs identifiables pour les écrans de refus
vi.mock("@/shared/components", () => ({
  AccesNonAutoriseAmo: function AccesNonAutoriseAmo() {
    return null;
  },
  AccesNonAutoriseAgentNonEnregistre: function AccesNonAutoriseAgentNonEnregistre() {
    return null;
  },
}));
vi.mock("./components/SuperAdminReadOnlyBanner", () => ({ default: () => null }));

import EspaceAgentLayout from "./layout";
import { checkProConnectAccess, checkRoleAccess } from "@/features/auth";
import { getCurrentAgent, isCurrentUserSuperAdmin } from "@/features/backoffice";
import { agentPermissionsRepository } from "@/shared/database";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";

const render = () => EspaceAgentLayout({ children: null });

describe("EspaceAgentLayout — gardes d'accès (§7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non authentifié → redirige vers la connexion agent", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({
      hasAccess: false,
      errorCode: "NOT_AUTHENTICATED",
    } as never);

    await expect(render()).rejects.toThrow("REDIRECT:/connexion/agent");
  });

  it("connecté en FranceConnect (mauvaise méthode) → écran accès non autorisé, pas de redirect", async () => {
    // hasAccess false mais errorCode != NOT_AUTHENTICATED (ex. méthode FranceConnect)
    vi.mocked(checkProConnectAccess).mockResolvedValue({
      hasAccess: false,
      errorCode: "WRONG_AUTH_METHOD",
    } as never);

    const result = await render();

    expect(result.type).toBe(AccesNonAutoriseAmo);
    expect(getCurrentAgent).not.toHaveBeenCalled();
  });

  it("agent non enregistré en BDD → écran agent non enregistré", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({ hasAccess: true } as never);
    vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "x" } as never);

    const result = await render();

    expect(result.type).toBe(AccesNonAutoriseAgentNonEnregistre);
  });

  it("rôle non habilité → écran accès non autorisé", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({ hasAccess: true } as never);
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-1", role: UserRole.PARTICULIER },
    } as never);
    vi.mocked(checkRoleAccess).mockResolvedValue({ hasAccess: false } as never);

    const result = await render();

    expect(result.type).toBe(AccesNonAutoriseAmo);
  });

  it("ANALYSTE national (sans département) → redirige vers /administration", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({ hasAccess: true } as never);
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-1", role: UserRole.ANALYSTE },
    } as never);
    vi.mocked(checkRoleAccess).mockResolvedValue({ hasAccess: true } as never);
    vi.mocked(agentPermissionsRepository.getDepartementsByAgentId).mockResolvedValue([]);

    await expect(render()).rejects.toThrow("REDIRECT:/administration");
  });

  it("ANALYSTE départemental → accès autorisé (rend le contenu)", async () => {
    vi.mocked(checkProConnectAccess).mockResolvedValue({ hasAccess: true } as never);
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-1", role: UserRole.ANALYSTE },
    } as never);
    vi.mocked(checkRoleAccess).mockResolvedValue({ hasAccess: true } as never);
    vi.mocked(agentPermissionsRepository.getDepartementsByAgentId).mockResolvedValue(["30"]);
    vi.mocked(isCurrentUserSuperAdmin).mockResolvedValue(false);

    const result = await render();

    // Élément <div> conteneur du layout (pas un écran de refus)
    expect(result.type).toBe("div");
  });
});
