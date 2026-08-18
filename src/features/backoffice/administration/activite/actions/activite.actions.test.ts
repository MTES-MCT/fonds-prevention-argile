import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { createMockAuthUser } from "@/shared/testing/mocks";

// La garde ensureSuperAdmin s'appuie sur checkAgentAccess (réexporté par @/features/auth)
vi.mock("@/features/auth", () => ({
  checkAgentAccess: vi.fn(),
}));
vi.mock("../services/activite.service", () => ({ getActiviteStats: vi.fn() }));

import { getActiviteStatsAction } from "./activite.actions";
import { checkAgentAccess } from "@/features/auth";
import { getActiviteStats } from "../services/activite.service";

const denied = () => ({ hasAccess: false, reason: "x" }) as Awaited<ReturnType<typeof checkAgentAccess>>;
const grantRole = (role: UserRole) =>
  ({ hasAccess: true, user: createMockAuthUser(role) }) as Awaited<ReturnType<typeof checkAgentAccess>>;

describe("activite.actions — réservé SUPER_ADMINISTRATEUR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiviteStats).mockResolvedValue({
      total: { valeur: 0, variation: null },
      demandeursDistincts: { valeur: 0, variation: null },
      parType: [],
    });
  });

  it("refuse un utilisateur non authentifié", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue(denied());

    const result = await getActiviteStatsAction("30j");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Non authentifié");
    expect(getActiviteStats).not.toHaveBeenCalled();
  });

  it.each([
    UserRole.ADMINISTRATEUR,
    UserRole.ANALYSTE,
    UserRole.AMO,
    UserRole.ALLERS_VERS,
    UserRole.AMO_ET_ALLERS_VERS,
  ])("refuse le rôle %s (réservé super-admin)", async (role) => {
    vi.mocked(checkAgentAccess).mockResolvedValue(grantRole(role));

    const result = await getActiviteStatsAction("30j");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Accès réservé aux super-administrateurs");
    expect(getActiviteStats).not.toHaveBeenCalled();
  });

  it("autorise le SUPER_ADMINISTRATEUR et transmet la periode/le departement", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue(grantRole(UserRole.SUPER_ADMINISTRATEUR));

    const result = await getActiviteStatsAction("90j", "36");

    expect(result.success).toBe(true);
    expect(getActiviteStats).toHaveBeenCalledWith("90j", "36");
  });
});
