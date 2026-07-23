import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { createEnvConfigMock } from "@/shared/testing/mocks";
import type { AuthUser } from "@/features/auth/domain/entities";

// Garde de lecture : getCurrentUser + db + verifyProspectTerritoryAccess (analyste).
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  verifyProspectTerritoryAccess: vi.fn(),
}));
vi.mock("@/shared/database/client", () => ({ db: { select: vi.fn() } }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());
vi.mock("@/features/parcours/dossiers-ds/adapters/graphql", () => ({
  demarchesSimplifieesClient: { query: vi.fn() },
}));
// Dépendances aval (uniquement atteintes quand la lecture est AUTORISÉE) : neutralisées.
vi.mock("@/shared/database/repositories/dossiers-demarches-simplifiees.repository", () => ({
  dossierDemarchesSimplifieesRepository: {
    getSubmittedDatesByStep: vi.fn().mockResolvedValue(new Map()),
    getProcessedDatesByStep: vi.fn().mockResolvedValue(new Map()),
  },
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/agent-edit-info.service", () => ({
  buildAgentEditInfo: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/parcours-creator.service", () => ({
  getParcoursCreator: vi.fn().mockResolvedValue(null),
}));

import { getDemandeDetail } from "./demande-detail.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import { db } from "@/shared/database/client";

const makeAgent = (role: UserRole, entrepriseAmoId?: string | null): AuthUser => ({
  id: "user-1",
  role,
  agentId: "agent-1",
  entrepriseAmoId: entrepriseAmoId ?? undefined,
  authMethod: "proconnect",
  loginTime: new Date().toISOString(),
  firstName: "Test",
  lastName: "Agent",
});

// La requête détail renvoie une ligne (validation/parcours/user).
const mockDemandeRow = (entrepriseAmoId: string | null, archivedAt: Date | null = null) => {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                validation: {
                  id: "demande-1",
                  entrepriseAmoId,
                  statut: "en_attente",
                  choisieAt: new Date(),
                  commentaire: null,
                },
                parcours: {
                  id: "parcours-1",
                  createdByAgentId: null,
                  createdAt: new Date(),
                  currentStep: "choix_amo",
                  archivedAt,
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

describe("getDemandeDetail — garde de lecture (§7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Par défaut, l'analyste est dans son territoire (pas d'erreur).
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);
  });

  it("refuse un utilisateur non authentifié", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Non authentifié");
  });

  it("refuse le rôle ALLERS_VERS (réservé AMO)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ALLERS_VERS, "amo-1"));
    mockDemandeRow("amo-1");

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Accès réservé aux AMO");
  });

  it("ANALYSTE dans son territoire : lecture AUTORISÉE (corrige le 404)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ANALYSTE));
    mockDemandeRow("amo-1");
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(true);
    expect(verifyProspectTerritoryAccess).toHaveBeenCalledWith(
      "parcours-1",
      expect.objectContaining({ role: UserRole.ANALYSTE })
    );
  });

  it("remonte archivedAt (pour la redirection archive-aware de la page demande)", async () => {
    const archiveDate = new Date("2026-07-20");
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, "amo-1"));
    mockDemandeRow("amo-1", archiveDate);

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.archivedAt).toEqual(archiveDate);
  });

  it("ANALYSTE hors de son territoire : refusé (scope territoire, pas « réservé AMO »)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ANALYSTE));
    mockDemandeRow("amo-1");
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue("Ce prospect n'est pas dans votre territoire");

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ce prospect n'est pas dans votre territoire");
      expect(result.error).not.toBe("Accès réservé aux AMO");
    }
  });

  it("refuse un AMO d'une autre entreprise (SCOPE:owner)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, "amo-A"));
    mockDemandeRow("amo-B");

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Cette demande ne vous est pas destinée");
  });

  it("refuse un AMO sans entreprise configurée", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.AMO, null));
    mockDemandeRow("amo-A");

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Votre compte AMO n'est pas configuré");
  });
});
