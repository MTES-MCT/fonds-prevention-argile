import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/features/parcours/dossiers-ds/services/reconciliation.service", () => ({
  rattacherDossierManuel: vi.fn(),
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/author-snapshot", () => ({
  buildAuthorSnapshot: vi.fn().mockResolvedValue({
    authorName: "Jean Test",
    authorStructure: "ACME",
    authorStructureType: "AMO",
  }),
}));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findById: vi.fn() },
  parcoursActionsRepo: { create: vi.fn() },
}));
// Le dossier appartient à l'entreprise "entreprise-123".
vi.mock("@/shared/database/client", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ entrepriseAmoId: "entreprise-123" }]) }) }),
    }),
  },
}));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  calculateAgentScope: vi.fn(),
  verifyProspectTerritoryAccess: vi.fn(),
}));

import { rattacherDossierDnAction } from "./rattacher-dossier-dn.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { rattacherDossierManuel } from "@/features/parcours/dossiers-ds/services/reconciliation.service";
import { parcoursRepo } from "@/shared/database/repositories";

const PARCOURS_ID = "11111111-1111-1111-1111-111111111111";

const baseScope = {
  isNational: false,
  entrepriseAmoIds: [] as string[],
  departements: [] as string[],
  epcis: [] as string[],
  canViewAllDossiers: false,
  canViewDossiersByEntreprise: false,
  canViewDossiersWithoutAmo: false,
};

function mockAgent(role: UserRole, entrepriseAmoId: string | null = null) {
  vi.mocked(getCurrentAgent).mockResolvedValue({
    success: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { id: "agent-1", role, entrepriseAmoId, allersVersId: null } as any,
  });
}

describe("rattacherDossierDnAction — contrôle d'accès", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(parcoursRepo.findById).mockResolvedValue({ id: PARCOURS_ID, currentStep: Step.ELIGIBILITE } as any);
    vi.mocked(rattacherDossierManuel).mockResolvedValue({
      success: true,
      data: { dsNumber: "32052358", step: Step.ELIGIBILITE },
    });
    vi.mocked(calculateAgentScope).mockResolvedValue({ ...baseScope });
  });

  it("refuse un rôle non habilité (analyste)", async () => {
    mockAgent(UserRole.ANALYSTE);

    const result = await rattacherDossierDnAction(PARCOURS_ID, "32052358");

    expect(result.success).toBe(false);
    expect(rattacherDossierManuel).not.toHaveBeenCalled();
  });

  it("refuse un AMO d'une autre entreprise", async () => {
    mockAgent(UserRole.AMO, "autre-entreprise");
    vi.mocked(calculateAgentScope).mockResolvedValue({ ...baseScope, canViewDossiersByEntreprise: true });

    const result = await rattacherDossierDnAction(PARCOURS_ID, "32052358");

    expect(result.success).toBe(false);
    expect(rattacherDossierManuel).not.toHaveBeenCalled();
  });

  it("autorise l'AMO de l'entreprise rattachée", async () => {
    mockAgent(UserRole.AMO, "entreprise-123");
    vi.mocked(calculateAgentScope).mockResolvedValue({ ...baseScope, canViewDossiersByEntreprise: true });

    const result = await rattacherDossierDnAction(PARCOURS_ID, "32052358");

    expect(result.success).toBe(true);
    expect(rattacherDossierManuel).toHaveBeenCalledWith({ parcoursId: PARCOURS_ID, dsNumber: "32052358" });
  });

  it("autorise un rôle national sans contrôle de périmètre", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    vi.mocked(calculateAgentScope).mockResolvedValue({ ...baseScope, canViewAllDossiers: true, isNational: true });

    const result = await rattacherDossierDnAction(PARCOURS_ID, "32052358");

    expect(result.success).toBe(true);
  });

  it("remonte le refus du service sans écrire d'audit", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    vi.mocked(calculateAgentScope).mockResolvedValue({ ...baseScope, canViewAllDossiers: true });
    vi.mocked(rattacherDossierManuel).mockResolvedValue({ success: false, error: "Numéro déjà rattaché" });

    const result = await rattacherDossierDnAction(PARCOURS_ID, "32052358");

    expect(result).toEqual({ success: false, error: "Numéro déjà rattaché" });
  });
});
