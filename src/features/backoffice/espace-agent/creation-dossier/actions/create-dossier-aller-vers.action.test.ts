import { describe, it, expect, vi, beforeEach } from "vitest";

// La garde d'accès a sa propre suite (acces-espace-agent.service.test.ts) : ici l'agent est admis.
vi.mock("@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service", () => ({
  refusAccesEspaceAgent: vi.fn().mockResolvedValue(null),
}));
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
vi.mock("../services/doublon-demandeur.service", () => ({
  detecterDoublonDemandeur: vi.fn(),
  presenterDoublonPourAgent: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());

import { createDossierAllerVersAction } from "./create-dossier-aller-vers.action";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { createDossierByAgent } from "../services/creation-dossier.service";
import { detecterDoublonDemandeur, presenterDoublonPourAgent } from "../services/doublon-demandeur.service";
import { presenterDoublon } from "../domain/doublon";

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

describe("createDossierAllerVersAction — demandeur déjà connu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
    vi.mocked(getCurrentUser).mockResolvedValue(
      makeAgent(UserRole.AMO_ET_ALLERS_VERS, { entrepriseAmoId: "amo-1", allersVersId: "av-1" })
    );
    vi.mocked(presenterDoublonPourAgent).mockImplementation(async (d) =>
      presenterDoublon(d.motif, "/espace-agent/dossiers/v-1")
    );
    vi.mocked(createDossierByAgent).mockResolvedValue({
      userId: "u-1",
      parcoursId: "p-1",
      claimToken: "t",
      claimUrl: "http://localhost/claim-dossier/t",
      emailSent: false,
    });
  });

  it("refuse un email déjà rattaché à un compte FranceConnect, même confirmé", async () => {
    vi.mocked(detecterDoublonDemandeur).mockResolvedValue({ motif: "compte", parcoursId: "p-existant" });

    const result = await createDossierAllerVersAction({ ...validInput(), confirmerDoublonAdresse: true });

    expect(result.success).toBe(false);
    if (!result.success && "doublon" in result) {
      expect(result.doublon.motif).toBe("compte");
      expect(result.doublon.lien).toBe("/espace-agent/dossiers/v-1");
    } else {
      throw new Error("doublon attendu");
    }
    expect(createDossierByAgent).not.toHaveBeenCalled();
  });

  it("refuse un email qui attend déjà un rattachement", async () => {
    vi.mocked(detecterDoublonDemandeur).mockResolvedValue({ motif: "invitation", parcoursId: "p-existant" });

    const result = await createDossierAllerVersAction(validInput());

    expect(result.success).toBe(false);
    expect(createDossierByAgent).not.toHaveBeenCalled();
  });

  it("alerte sur un logement déjà connu, puis crée une fois confirmé", async () => {
    vi.mocked(detecterDoublonDemandeur).mockResolvedValue({ motif: "adresse", parcoursId: "p-existant" });

    const sansConfirmation = await createDossierAllerVersAction(validInput());
    expect(sansConfirmation.success).toBe(false);
    expect(createDossierByAgent).not.toHaveBeenCalled();

    const confirme = await createDossierAllerVersAction({ ...validInput(), confirmerDoublonAdresse: true });
    expect(confirme.success).toBe(true);
    expect(createDossierByAgent).toHaveBeenCalledTimes(1);
  });

  it("cherche le logement par la clé BAN de l'adresse saisie", async () => {
    vi.mocked(detecterDoublonDemandeur).mockResolvedValue(null);

    await createDossierAllerVersAction({
      ...validInput(),
      adresseBien: "12 Rue des Lilas 03000 Moulins",
      adresseBienDetails: {
        label: "12 Rue des Lilas 03000 Moulins",
        clefBan: "03190_1234_00012",
        codeCommune: "03190",
        nomCommune: "Moulins",
        codePostal: "03000",
        codeDepartement: "03",
        codeRegion: "84",
        coordinates: { lat: 46.56, lon: 3.33 },
      },
    });

    expect(detecterDoublonDemandeur).toHaveBeenCalledWith({
      email: "jean@example.com",
      adresse: { clefBan: "03190_1234_00012", label: "12 Rue des Lilas 03000 Moulins" },
    });
    expect(createDossierByAgent).toHaveBeenCalledTimes(1);
  });
});
