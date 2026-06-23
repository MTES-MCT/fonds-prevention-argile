import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/features/auth", () => ({
  checkAgentAccess: vi.fn(),
  ROUTES: {
    connexion: { agent: "/connexion/agent" },
    backoffice: { espaceAgent: { root: "/espace-agent" } },
  },
}));

vi.mock("@/shared/components", () => ({
  AccesNonAutoriseAdmin: function AccesNonAutoriseAdmin() {
    return null;
  },
}));

vi.mock("./tableau-de-bord/TableauDeBord", () => ({
  TableauDeBord: function TableauDeBord() {
    return null;
  },
}));

import AdminPage from "./page";
import { checkAgentAccess } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { TableauDeBord } from "./tableau-de-bord/TableauDeBord";

const grant = (role: UserRole) => ({ hasAccess: true, user: { role } }) as never;

describe("AdminPage — garde de route /administration (§7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non authentifié → redirige vers la connexion agent", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue({ hasAccess: false, errorCode: "NOT_AUTHENTICATED" } as never);
    await expect(AdminPage()).rejects.toThrow("REDIRECT:/connexion/agent");
  });

  it("connecté mais non agent (PARTICULIER) → écran 403 admin", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue({ hasAccess: false, errorCode: "FORBIDDEN" } as never);
    const result = await AdminPage();
    expect(result.type).toBe(AccesNonAutoriseAdmin);
  });

  it.each([UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS, UserRole.ALLERS_VERS])(
    "redirige le rôle %s vers l'espace agent",
    async (role) => {
      vi.mocked(checkAgentAccess).mockResolvedValue(grant(role));
      await expect(AdminPage()).rejects.toThrow("REDIRECT:/espace-agent");
    }
  );

  it.each([UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR, UserRole.ANALYSTE])(
    "autorise le rôle %s (rend le tableau de bord)",
    async (role) => {
      vi.mocked(checkAgentAccess).mockResolvedValue(grant(role));
      const result = await AdminPage();
      expect(result.type).toBe(TableauDeBord);
    }
  );
});
