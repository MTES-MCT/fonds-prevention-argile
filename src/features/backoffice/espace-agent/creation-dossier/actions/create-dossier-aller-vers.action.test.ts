import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { createEnvConfigMock } from "@/shared/testing/mocks";
import type { AuthUser } from "@/features/auth/domain/entities";

// Mocks AVANT les imports. hasPermission n'est PAS mocké : on exerce la vraie
// matrice RBAC (DOSSIERS_CREATE) pour vérifier que l'ANALYSTE est bien exclu.
vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({
  assertNotSuperAdminReadOnly: vi.fn(),
}));
vi.mock("@/features/auth/services/user.service", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("../services/creation-dossier.service", () => ({
  createDossierByAgent: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());

import { createDossierAllerVersAction } from "./create-dossier-aller-vers.action";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { createDossierByAgent } from "../services/creation-dossier.service";

const makeAgent = (role: UserRole, override?: Partial<AuthUser>): AuthUser => ({
  id: "user-1",
  role,
  agentId: "agent-1",
  authMethod: "proconnect",
  loginTime: new Date().toISOString(),
  firstName: "Test",
  lastName: "Agent",
  ...override,
});

const validInput = (intent?: "amo" | "av") => ({
  demandeur: { nom: "Dupont", prenom: "Jean", email: "jean@example.com" },
  sendEmail: false,
  ...(intent ? { intent } : {}),
});

describe("createDossierAllerVersAction — cellules négatives RBAC (§7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
  });

  it("refuse le SUPER_ADMINISTRATEUR (lecture seule), avant toute autre vérif", async () => {
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(
      "Action non autorisée : l'espace agent est en lecture seule pour les super administrateurs."
    );

    const result = await createDossierAllerVersAction(validInput());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("lecture seule");
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(createDossierByAgent).not.toHaveBeenCalled();
  });

  it("refuse un utilisateur non authentifié", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    const result = await createDossierAllerVersAction(validInput());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Non authentifié");
    expect(createDossierByAgent).not.toHaveBeenCalled();
  });

  it("refuse l'ANALYSTE (pas de permission DOSSIERS_CREATE)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeAgent(UserRole.ANALYSTE, { entrepriseAmoId: undefined }));

    const result = await createDossierAllerVersAction(validInput());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Permission refusée");
    expect(createDossierByAgent).not.toHaveBeenCalled();
  });

  it("refuse un AMO non rattaché à une structure", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(
      makeAgent(UserRole.AMO, { entrepriseAmoId: undefined, allersVersId: undefined })
    );

    const result = await createDossierAllerVersAction(validInput());

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("non rattaché");
    expect(createDossierByAgent).not.toHaveBeenCalled();
  });

  it("refuse le mode AV à un agent sans allersVersId (AMO forçant intent=av)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(
      makeAgent(UserRole.AMO, { entrepriseAmoId: "amo-1", allersVersId: undefined })
    );

    const result = await createDossierAllerVersAction(validInput("av"));

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Aller-vers");
    expect(createDossierByAgent).not.toHaveBeenCalled();
  });
});
