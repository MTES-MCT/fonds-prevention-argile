import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { createMockAuthUser } from "@/shared/testing/mocks";

vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));
vi.mock("../services/activite.service", () => ({ getActiviteStats: vi.fn() }));

import { getActiviteStatsAction } from "./activite.actions";
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { getActiviteStats } from "../services/activite.service";

describe("activite.actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiviteStats).mockResolvedValue({
      total: { valeur: 0, variation: null },
      demandeursDistincts: { valeur: 0, variation: null },
      delaiMoyenPremiereReponse: { valeurHeures: null, variation: null },
      demandeursSansReponse: { valeur: 0, variation: null },
      parType: [],
    });
  });

  it("refuse un accès sans la permission STATS_READ", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: false,
      reason: "Permission insuffisante",
      errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
    });

    const result = await getActiviteStatsAction("30j");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Permission insuffisante pour consulter les statistiques");
    expect(getActiviteStats).not.toHaveBeenCalled();
  });

  it.each([
    UserRole.SUPER_ADMINISTRATEUR,
    UserRole.ADMINISTRATEUR,
    UserRole.ANALYSTE,
    UserRole.AMO,
    UserRole.ALLERS_VERS,
    UserRole.AMO_ET_ALLERS_VERS,
  ])("autorise le rôle %s (STATS_READ) et transmet la periode/le departement", async (role) => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({ hasAccess: true, user: createMockAuthUser(role) });

    const result = await getActiviteStatsAction("90j", "36");

    expect(result.success).toBe(true);
    expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.STATS_READ);
    expect(getActiviteStats).toHaveBeenCalledWith("90j", "36");
  });
});
