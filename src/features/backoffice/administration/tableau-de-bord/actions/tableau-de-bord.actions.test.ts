import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { createMockAuthUser, createEnvConfigMock } from "@/shared/testing/mocks";
import type { AgentScope } from "@/features/auth/permissions/domain/types/agent-scope.types";

// Mocks AVANT les imports
vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));

vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  calculateAgentScope: vi.fn(),
}));

vi.mock("@/features/auth/services/user.service", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("../services/tableau-de-bord.service", () => ({
  getTableauDeBordStats: vi.fn(),
  getMatomoSimulationsStats: vi.fn(),
  getAutresDemandesArchiveesDetail: vi.fn(),
  getEligibiliteStats: vi.fn(),
  getTopDepartementsMatomo: vi.fn(),
  getTopCommunesMatomo: vi.fn(),
}));

vi.mock("@/features/backoffice/administration/acquisition/services/statistiques-departement.service", () => ({
  getAvailableDepartements: vi.fn(),
}));

vi.mock("@/shared/config/env.config", () => createEnvConfigMock());

import { getAutresDemandesArchiveesAction } from "./tableau-de-bord.actions";
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { getAutresDemandesArchiveesDetail } from "../services/tableau-de-bord.service";

/**
 * Scope de base, surchargé par cas. Par défaut : analyste sans périmètre.
 */
const makeScope = (override: Partial<AgentScope>): AgentScope => ({
  isNational: false,
  entrepriseAmoIds: [],
  departements: [],
  epcis: [],
  canViewAllDossiers: false,
  canViewDossiersByEntreprise: false,
  canViewDossiersWithoutAmo: false,
  ...override,
});

describe("getAutresDemandesArchiveesAction (surface nominative scopée)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAutresDemandesArchiveesDetail).mockResolvedValue({ total: 0, demandes: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuse l'accès sans la permission STATS_READ (ne touche ni session ni service)", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: false,
      reason: "Permission insuffisante",
      errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
    });

    const result = await getAutresDemandesArchiveesAction("30j");

    expect(result.success).toBe(false);
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(getAutresDemandesArchiveesDetail).not.toHaveBeenCalled();
  });

  it("ADMIN : accès national, le service reçoit scopeDepartements = null", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: true,
      user: createMockAuthUser(UserRole.ADMINISTRATEUR),
    });
    vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser(UserRole.ADMINISTRATEUR));
    vi.mocked(calculateAgentScope).mockResolvedValue(
      makeScope({
        isNational: true,
        canViewAllDossiers: true,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: true,
      })
    );

    await getAutresDemandesArchiveesAction("30j", "75");

    expect(getAutresDemandesArchiveesDetail).toHaveBeenCalledWith("30j", "75", undefined, null);
  });

  it("ANALYSTE départemental : le service est scopé à ses départements", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: true,
      user: createMockAuthUser(UserRole.ANALYSTE, { agentId: "agent-1" }),
    });
    vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser(UserRole.ANALYSTE, { agentId: "agent-1" }));
    vi.mocked(calculateAgentScope).mockResolvedValue(makeScope({ departements: ["30", "34"] }));

    await getAutresDemandesArchiveesAction("30j");

    expect(getAutresDemandesArchiveesDetail).toHaveBeenCalledWith("30j", undefined, undefined, ["30", "34"]);
  });

  // ADR-0017 : les agents AMO / Allers-Vers ont désormais STATS_READ (stats nationales),
  // et un `scope.departements` non vide (leur territoire). Cette surface étant NOMINATIVE,
  // ils ne doivent JAMAIS y accéder malgré leurs départements — seul le rôle ANALYSTE
  // ouvre la branche territoriale.
  it.each([UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS])(
    "%s avec un territoire : aucune donnée nominative, service jamais appelé (anti-fuite ADR-0017)",
    async (role) => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: createMockAuthUser(role, { agentId: "agent-1" }),
      });
      vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser(role, { agentId: "agent-1" }));
      // Scope avec des départements (comme un vrai AMO/AV) : ne doit PAS ouvrir le nominatif.
      vi.mocked(calculateAgentScope).mockResolvedValue(makeScope({ departements: ["30", "34"] }));

      const result = await getAutresDemandesArchiveesAction("30j");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ total: 0, demandes: [] });
      }
      expect(getAutresDemandesArchiveesDetail).not.toHaveBeenCalled();
    }
  );

  it("ANALYSTE national (sans département) : aucune donnée nominative, service jamais appelé", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: true,
      user: createMockAuthUser(UserRole.ANALYSTE),
    });
    vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser(UserRole.ANALYSTE));
    vi.mocked(calculateAgentScope).mockResolvedValue(makeScope({ isNational: true }));

    const result = await getAutresDemandesArchiveesAction("30j");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ total: 0, demandes: [] });
    }
    expect(getAutresDemandesArchiveesDetail).not.toHaveBeenCalled();
  });

  it("ANALYSTE départemental ne peut pas élargir via un codeDepartement hors périmètre : le scope reste la borne", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: true,
      user: createMockAuthUser(UserRole.ANALYSTE, { agentId: "agent-1" }),
    });
    vi.mocked(getCurrentUser).mockResolvedValue(createMockAuthUser(UserRole.ANALYSTE, { agentId: "agent-1" }));
    vi.mocked(calculateAgentScope).mockResolvedValue(makeScope({ departements: ["30"] }));

    // L'analyste tente un autre département (75) : le service est toujours appelé
    // avec sa borne territoriale ["30"] qui filtre côté service (intersection vide).
    await getAutresDemandesArchiveesAction("30j", "75");

    expect(getAutresDemandesArchiveesDetail).toHaveBeenCalledWith("30j", "75", undefined, ["30"]);
  });

  it("session absente : refus", async () => {
    vi.mocked(checkBackofficePermission).mockResolvedValue({
      hasAccess: true,
      user: createMockAuthUser(UserRole.ANALYSTE),
    });
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getAutresDemandesArchiveesAction("30j");

    expect(result.success).toBe(false);
    expect(getAutresDemandesArchiveesDetail).not.toHaveBeenCalled();
  });
});
