import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { createMockAuthUser, createEnvConfigMock } from "@/shared/testing/mocks";

// La garde ensureSuperAdmin s'appuie sur checkAgentAccess (réexporté par @/features/auth)
vi.mock("@/features/auth", () => ({
  checkAgentAccess: vi.fn(),
}));
vi.mock("../services/diagnostics.service", () => ({ getParcoursDiagnostics: vi.fn() }));
vi.mock("../services/demarches-sante.service", () => ({ getDemarchesSante: vi.fn() }));
vi.mock("../services/diagnostics-detail.service", () => ({
  getParcoursDiagnosticDetail: vi.fn(),
  searchEligibiliteByEmail: vi.fn(),
  probeDnForSyncErrors: vi.fn(),
}));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());

import {
  listDiagnosticsAction,
  getDemarchesSanteAction,
  getParcoursDiagnosticDetailAction,
  probeDnSyncErrorsAction,
  searchEligibiliteByEmailAction,
} from "./diagnostics.actions";
import { checkAgentAccess } from "@/features/auth";
import { getParcoursDiagnostics } from "../services/diagnostics.service";

const denied = () => ({ hasAccess: false, reason: "x" }) as Awaited<ReturnType<typeof checkAgentAccess>>;
const grantRole = (role: UserRole) =>
  ({ hasAccess: true, user: createMockAuthUser(role) }) as Awaited<ReturnType<typeof checkAgentAccess>>;

describe("diagnostics.actions — réservé SUPER_ADMINISTRATEUR (§7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getParcoursDiagnostics).mockResolvedValue({} as never);
  });

  it("refuse un utilisateur non authentifié sur toutes les actions", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue(denied());

    const results = await Promise.all([
      listDiagnosticsAction(),
      getDemarchesSanteAction(),
      getParcoursDiagnosticDetailAction("p-1"),
      probeDnSyncErrorsAction(),
      searchEligibiliteByEmailAction("p-1"),
    ]);

    for (const r of results) {
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBe("Non authentifié");
    }
    expect(getParcoursDiagnostics).not.toHaveBeenCalled();
  });

  it.each([UserRole.ADMINISTRATEUR, UserRole.ANALYSTE, UserRole.AMO, UserRole.ALLERS_VERS])(
    "refuse le rôle %s (réservé super-admin)",
    async (role) => {
      vi.mocked(checkAgentAccess).mockResolvedValue(grantRole(role));

      const result = await listDiagnosticsAction();

      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toBe("Accès réservé aux super-administrateurs");
      expect(getParcoursDiagnostics).not.toHaveBeenCalled();
    }
  );

  it("autorise le SUPER_ADMINISTRATEUR", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue(grantRole(UserRole.SUPER_ADMINISTRATEUR));

    const result = await listDiagnosticsAction();

    expect(result.success).toBe(true);
    expect(getParcoursDiagnostics).toHaveBeenCalled();
  });
});
