import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";

vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));
vi.mock("../services/centres-communes.service", () => ({
  getCentresCommunes: vi.fn(async () => ({ centres: { "03185": [2.6, 46.34] }, departementsEnEchec: [] })),
}));

import { getCentresCommunesAction } from "./carte-demandeurs.actions";
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { getCentresCommunes } from "../services/centres-communes.service";

describe("getCentresCommunesAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse sans la permission USERS_STATS_READ, sans appeler l'API Geo", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: false,
      errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
    } as never);

    const res = await getCentresCommunesAction(["03185"]);

    expect(res.success).toBe(false);
    expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.USERS_STATS_READ);
    expect(getCentresCommunes).not.toHaveBeenCalled();
  });

  it("refuse une charge utile qui n'est pas une liste de codes INSEE", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({ hasAccess: true } as never);

    const res = await getCentresCommunesAction(["03185", "../etc"]);

    expect(res.success).toBe(false);
    expect(getCentresCommunes).not.toHaveBeenCalled();
  });

  it("renvoie les centres avec la permission", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({ hasAccess: true } as never);

    const res = await getCentresCommunesAction(["03185"]);

    expect(res).toEqual({ success: true, data: { centres: { "03185": [2.6, 46.34] }, departementsEnEchec: [] } });
    expect(getCentresCommunes).toHaveBeenCalledWith(["03185"]);
  });
});
