import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { createEnvConfigMock } from "@/shared/testing/mocks";
import type { AuthUser } from "@/features/auth/domain/entities";

// Garde de lecture : getCurrentUser + db. Les chemins DENY court-circuitent
// avant la construction du détail (repos/services), inutile de les mocker.
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/shared/database/client", () => ({ db: { select: vi.fn() } }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());
vi.mock("@/features/parcours/dossiers-ds/adapters/graphql", () => ({
  demarchesSimplifieesClient: { query: vi.fn() },
}));

import { getDemandeDetail } from "./demande-detail.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { db } from "@/shared/database/client";

const makeAgent = (role: UserRole, entrepriseAmoId?: string | null): AuthUser => ({
  id: "user-1",
  role,
  entrepriseAmoId: entrepriseAmoId ?? undefined,
  authMethod: "proconnect",
  loginTime: new Date().toISOString(),
  firstName: "Test",
  lastName: "Agent",
});

// La requête détail renvoie une ligne (validation/parcours/user) ; on ne fixe que
// l'entrepriseAmoId propriétaire, seul champ lu avant le contrôle d'accès.
const mockDemandeRow = (entrepriseAmoId: string | null) => {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                validation: { id: "demande-1", entrepriseAmoId },
                parcours: { id: "parcours-1" },
                user: { id: "user-x" },
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
  });

  it("refuse un utilisateur non authentifié", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Non authentifié");
  });

  it.each([UserRole.ANALYSTE, UserRole.ALLERS_VERS])("refuse le rôle %s (réservé AMO)", async (role) => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(role, "amo-1"));
    mockDemandeRow("amo-1");

    const result = await getDemandeDetail("demande-1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Accès réservé aux AMO");
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
