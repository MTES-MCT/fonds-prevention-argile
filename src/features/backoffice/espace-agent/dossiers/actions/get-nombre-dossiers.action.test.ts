import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { getNombreDossiersAction } from "./get-nombre-dossiers.action";
import { resolveEspaceAgentAccess } from "@/features/backoffice/shared/actions/super-admin-access";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { parcoursRepo } from "@/shared/database";

vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({
  resolveEspaceAgentAccess: vi.fn(),
}));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  calculateAgentScope: vi.fn(),
}));
vi.mock("@/shared/database", () => ({
  parcoursRepo: { countParcoursByTerritoire: vi.fn() },
}));

const countMock = vi.mocked(parcoursRepo.countParcoursByTerritoire);

function mockAgent(role: UserRole) {
  vi.mocked(resolveEspaceAgentAccess).mockResolvedValue({
    kind: "agent",
    agent: { id: "agent-1", role, entrepriseAmoId: null, allersVersId: null },
  } as never);
}

function mockScope(scope: Record<string, unknown>) {
  vi.mocked(calculateAgentScope).mockResolvedValue(scope as never);
}

const baseScope = {
  isNational: false,
  entrepriseAmoIds: [],
  departements: [],
  epcis: [],
  canViewAllDossiers: false,
  canViewDossiersByEntreprise: false,
  canViewDossiersWithoutAmo: false,
};

describe("getNombreDossiersAction — périmètre du compteur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne 0 pour un analyste national (stats only, aucun dossier individuel)", async () => {
    mockAgent(UserRole.ANALYSTE);
    // isNational vrai mais canViewAllDossiers faux : ne doit PAS compter les 170.
    mockScope({ ...baseScope, isNational: true });
    const count = await getNombreDossiersAction();
    expect(count).toBe(0);
    expect(countMock).not.toHaveBeenCalled();
  });

  it("compte le territoire d'un analyste départemental", async () => {
    mockAgent(UserRole.ANALYSTE);
    mockScope({ ...baseScope, departements: ["35"] });
    countMock.mockResolvedValue(7);
    const count = await getNombreDossiersAction();
    expect(count).toBe(7);
    expect(countMock).toHaveBeenCalledWith(["35"], []);
  });

  it("compte tous les dossiers pour un rôle à accès global (canViewAllDossiers)", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    mockScope({ ...baseScope, isNational: true, canViewAllDossiers: true });
    countMock.mockResolvedValue(170);
    const count = await getNombreDossiersAction();
    expect(count).toBe(170);
    expect(countMock).toHaveBeenCalledWith([], []);
  });
});
