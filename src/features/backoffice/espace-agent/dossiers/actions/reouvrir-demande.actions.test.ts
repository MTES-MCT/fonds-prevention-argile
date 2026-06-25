import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/features/parcours/amo/services/reouverture-demande.service", () => ({
  reouvrirDemandeRefusee: vi.fn(),
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
// Validation rattachée à l'entreprise "entreprise-123".
vi.mock("@/shared/database/client", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ entrepriseAmoId: "entreprise-123" }]) }) }),
    }),
  },
}));
// On garde `canReopenRefusedDemande` réel, on ne mocke que `calculateAgentScope`.
vi.mock("@/features/auth/permissions/services/agent-scope.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/auth/permissions/services/agent-scope.service")>();
  return { ...actual, calculateAgentScope: vi.fn() };
});

import { reouvrirDemandeAction } from "./reouvrir-demande.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { reouvrirDemandeRefusee } from "@/features/parcours/amo/services/reouverture-demande.service";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { parcoursRepo, parcoursActionsRepo } from "@/shared/database/repositories";

const PARCOURS_ID = "11111111-1111-1111-1111-111111111111";

const parcours75 = {
  id: PARCOURS_ID,
  rgaSimulationData: { logement: { code_departement: "75" } },
  rgaSimulationDataAgent: null,
};

const baseScope = {
  isNational: false,
  entrepriseAmoIds: [] as string[],
  departements: [] as string[],
  epcis: [] as string[],
  canViewAllDossiers: false,
  canViewDossiersByEntreprise: false,
  canViewDossiersWithoutAmo: false,
};

function mockAgent(role: UserRole, extra: { entrepriseAmoId?: string | null; allersVersId?: string | null } = {}) {
  vi.mocked(getCurrentAgent).mockResolvedValue({
    success: true,
    data: { id: "agent-1", role, entrepriseAmoId: null, allersVersId: null, ...extra },
  } as never);
}

describe("reouvrirDemandeAction — RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parcoursRepo.findById).mockResolvedValue(parcours75 as never);
    vi.mocked(reouvrirDemandeRefusee).mockResolvedValue({
      success: true,
      data: { newToken: "tok", emailSent: true, amoNom: "ACME", demandeurNom: "X", demandeurPrenom: "Y" },
    } as never);
  });

  it("refuse un analyste (rôle non habilité) sans appeler le service", async () => {
    mockAgent(UserRole.ANALYSTE);
    vi.mocked(calculateAgentScope).mockResolvedValue({ ...baseScope, departements: ["75"] } as never);

    const res = await reouvrirDemandeAction(PARCOURS_ID);

    expect(res.success).toBe(false);
    expect(reouvrirDemandeRefusee).not.toHaveBeenCalled();
  });

  it("refuse un non-authentifié", async () => {
    vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" } as never);

    const res = await reouvrirDemandeAction(PARCOURS_ID);

    expect(res.success).toBe(false);
    expect(reouvrirDemandeRefusee).not.toHaveBeenCalled();
  });

  it("autorise l'AMO de l'entreprise rattachée et trace l'action", async () => {
    mockAgent(UserRole.AMO, { entrepriseAmoId: "entreprise-123" });
    vi.mocked(calculateAgentScope).mockResolvedValue({
      ...baseScope,
      entrepriseAmoIds: ["entreprise-123"],
      canViewDossiersByEntreprise: true,
    } as never);

    const res = await reouvrirDemandeAction(PARCOURS_ID);

    expect(res.success).toBe(true);
    expect(reouvrirDemandeRefusee).toHaveBeenCalledWith({ parcoursId: PARCOURS_ID, sendEmailToAmo: true });
    expect(parcoursActionsRepo.create).toHaveBeenCalledTimes(1);
  });

  it("refuse un AMO d'une autre entreprise", async () => {
    mockAgent(UserRole.AMO, { entrepriseAmoId: "entreprise-999" });
    vi.mocked(calculateAgentScope).mockResolvedValue({
      ...baseScope,
      entrepriseAmoIds: ["entreprise-999"],
      canViewDossiersByEntreprise: true,
    } as never);

    const res = await reouvrirDemandeAction(PARCOURS_ID);

    expect(res.success).toBe(false);
    expect(reouvrirDemandeRefusee).not.toHaveBeenCalled();
  });

  it("autorise l'AV couvrant le territoire (malgré l'AMO sur la demande)", async () => {
    mockAgent(UserRole.ALLERS_VERS, { allersVersId: "av-1" });
    vi.mocked(calculateAgentScope).mockResolvedValue({
      ...baseScope,
      departements: ["75"],
      canViewDossiersWithoutAmo: true,
    } as never);

    const res = await reouvrirDemandeAction(PARCOURS_ID);

    expect(res.success).toBe(true);
    expect(reouvrirDemandeRefusee).toHaveBeenCalled();
  });

  it("refuse l'AV hors de son territoire", async () => {
    mockAgent(UserRole.ALLERS_VERS, { allersVersId: "av-1" });
    vi.mocked(calculateAgentScope).mockResolvedValue({
      ...baseScope,
      departements: ["33"],
      canViewDossiersWithoutAmo: true,
    } as never);

    const res = await reouvrirDemandeAction(PARCOURS_ID);

    expect(res.success).toBe(false);
    expect(reouvrirDemandeRefusee).not.toHaveBeenCalled();
  });

  it("autorise le super-administrateur (accès national)", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    vi.mocked(calculateAgentScope).mockResolvedValue({
      ...baseScope,
      isNational: true,
      canViewAllDossiers: true,
    } as never);

    const res = await reouvrirDemandeAction(PARCOURS_ID);

    expect(res.success).toBe(true);
    expect(reouvrirDemandeRefusee).toHaveBeenCalled();
  });
});
