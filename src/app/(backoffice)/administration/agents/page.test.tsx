import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/features/auth", () => ({
  checkAgentAccess: vi.fn(),
  ROUTES: { connexion: { agent: "/connexion/agent" } },
}));

vi.mock("@/shared/components", () => ({
  AccesNonAutoriseSuperAdmin: function AccesNonAutoriseSuperAdmin() {
    return null;
  },
}));

vi.mock("./components/AgentsPanel", () => ({
  default: function AgentsPanel() {
    return null;
  },
}));

import GestionUtilisateursPage from "./page";
import { checkAgentAccess } from "@/features/auth";
import { AccesNonAutoriseSuperAdmin } from "@/shared/components";
import AgentsPanel from "./components/AgentsPanel";

const grant = (role: UserRole) => ({ hasAccess: true, user: { role } }) as never;

describe("GestionUtilisateursPage — garde de route /administration/agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non authentifié → redirige vers la connexion agent", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue({ hasAccess: false, errorCode: "NOT_AUTHENTICATED" } as never);
    await expect(GestionUtilisateursPage()).rejects.toThrow("REDIRECT:/connexion/agent");
  });

  it.each([UserRole.ADMINISTRATEUR, UserRole.ANALYSTE, UserRole.AMO, UserRole.ALLERS_VERS])(
    "%s → écran 403 qui nomme le rôle super-administrateur",
    async (role) => {
      vi.mocked(checkAgentAccess).mockResolvedValue(grant(role));
      const result = await GestionUtilisateursPage();
      expect(result.type).toBe(AccesNonAutoriseSuperAdmin);
    }
  );

  it("super-administrateur → liste des agents", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue(grant(UserRole.SUPER_ADMINISTRATEUR));
    const result = await GestionUtilisateursPage();
    expect(result.type).toBe(AgentsPanel);
  });
});
