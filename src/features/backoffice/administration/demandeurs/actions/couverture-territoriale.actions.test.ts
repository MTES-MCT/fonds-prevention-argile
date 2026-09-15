import { describe, it, expect, vi, beforeEach } from "vitest";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";

vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));
vi.mock("@/features/backoffice/administration/shared/services/couverture-territoriale.service", () => ({
  getDepartementsNonCouverts: vi.fn(async () => ["04", "82"]),
}));

import { getDepartementsNonCouvertsAction } from "./couverture-territoriale.actions";
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { getDepartementsNonCouverts } from "@/features/backoffice/administration/shared/services/couverture-territoriale.service";

describe("getDepartementsNonCouvertsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse sans la permission USERS_READ (et n'interroge pas la base)", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: false,
      errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
    } as never);

    const res = await getDepartementsNonCouvertsAction();

    expect(res.success).toBe(false);
    expect(getDepartementsNonCouverts).not.toHaveBeenCalled();
    expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.USERS_READ);
  });

  it("renvoie les départements non couverts avec la permission", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({ hasAccess: true } as never);

    const res = await getDepartementsNonCouvertsAction();

    expect(res).toEqual({ success: true, data: ["04", "82"] });
  });
});
