import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { createEnvConfigMock } from "@/shared/testing/mocks";
import type { AuthUser } from "@/features/auth/domain/entities";

// Garde d'accès : getCurrentUser + db + verifyProspectTerritoryAccess (dossiers sans AMO).
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  verifyProspectTerritoryAccess: vi.fn(),
}));
vi.mock("@/shared/database/client", () => ({ db: { select: vi.fn() } }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());
// Neutralise la dérivation RGA (atteinte uniquement quand l'accès est AUTORISÉ).
vi.mock("@/features/parcours/core/services/rga-data.service", () => ({
  getEffectiveRGAData: vi.fn().mockReturnValue(null),
}));

import { getDossierSimulationData } from "./edition-simulation.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import { db } from "@/shared/database/client";

const makeAgent = (
  role: UserRole,
  opts: { entrepriseAmoId?: string | null; allersVersId?: string | null } = {}
): AuthUser => ({
  id: "user-1",
  role,
  agentId: "agent-1",
  entrepriseAmoId: opts.entrepriseAmoId ?? undefined,
  allersVersId: opts.allersVersId ?? undefined,
  authMethod: "proconnect",
  loginTime: new Date().toISOString(),
  firstName: "Test",
  lastName: "Agent",
});

// La 1re requête (par id de validation) renvoie une ligne validation/parcours/user.
const mockValidationRow = (statut: StatutValidationAmo, entrepriseAmoId: string | null) => {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                validation: { id: "validation-1", entrepriseAmoId, statut },
                parcours: {
                  id: "parcours-1",
                  rgaSimulationData: null,
                  rgaSimulationDataAgent: null,
                },
                user: { id: "user-x", prenom: "Jean", nom: "Dupont" },
              },
            ]),
          }),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

describe("getDossierSimulationData — accès à l'édition de simulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);
  });

  it("refuse un utilisateur non authentifié", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getDossierSimulationData("validation-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Non authentifié");
  });

  it("ALLERS_VERS sur un dossier SANS_AMO de son territoire : AUTORISÉ (corrige le 404)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ALLERS_VERS, { allersVersId: "av-1" }));
    mockValidationRow(StatutValidationAmo.SANS_AMO, null);
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);

    const result = await getDossierSimulationData("validation-1");

    expect(result.success).toBe(true);
    expect(verifyProspectTerritoryAccess).toHaveBeenCalledWith(
      "parcours-1",
      expect.objectContaining({ role: UserRole.ALLERS_VERS, allersVersId: "av-1" })
    );
  });

  it("ALLERS_VERS sur un dossier SANS_AMO hors de son territoire : REFUSÉ", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ALLERS_VERS, { allersVersId: "av-1" }));
    mockValidationRow(StatutValidationAmo.SANS_AMO, null);
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue("Ce prospect n'est pas dans votre territoire");

    const result = await getDossierSimulationData("validation-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ce prospect n'est pas dans votre territoire");
  });

  it("AMO propriétaire d'un dossier avec entreprise : AUTORISÉ (ownership, pas de contrôle territorial)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, { entrepriseAmoId: "amo-A" }));
    mockValidationRow(StatutValidationAmo.LOGEMENT_ELIGIBLE, "amo-A");

    const result = await getDossierSimulationData("validation-1");

    expect(result.success).toBe(true);
    expect(verifyProspectTerritoryAccess).not.toHaveBeenCalled();
  });

  it("AMO d'une autre entreprise : REFUSÉ (ownership)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, { entrepriseAmoId: "amo-A" }));
    mockValidationRow(StatutValidationAmo.EN_ATTENTE, "amo-B");

    const result = await getDossierSimulationData("validation-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ce dossier ne vous est pas destiné");
  });

  it("AUTORISE la correction d'un dossier devenu non éligible (LOGEMENT_NON_ELIGIBLE)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, { entrepriseAmoId: "amo-A" }));
    mockValidationRow(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, "amo-A");

    const result = await getDossierSimulationData("validation-1");

    expect(result.success).toBe(true);
  });

  it("refuse un statut non éditable (accompagnement refusé)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ALLERS_VERS, { allersVersId: "av-1" }));
    mockValidationRow(StatutValidationAmo.ACCOMPAGNEMENT_REFUSE, null);

    const result = await getDossierSimulationData("validation-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ce dossier ne permet pas l'édition des données de simulation");
  });

  it("refuse un rôle non habilité (analyste)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ANALYSTE));
    mockValidationRow(StatutValidationAmo.SANS_AMO, null);

    const result = await getDossierSimulationData("validation-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Accès réservé aux agents");
  });
});
