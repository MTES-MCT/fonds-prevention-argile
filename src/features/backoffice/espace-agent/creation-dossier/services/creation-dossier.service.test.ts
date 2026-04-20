import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDossierByAgent } from "./creation-dossier.service";

vi.mock("@/shared/database/repositories", () => ({
  userRepo: {
    createStub: vi.fn(),
  },
  parcoursRepo: {
    findOrCreateForUser: vi.fn(),
    updateRGADataAgent: vi.fn(),
  },
}));

vi.mock("@/shared/email/actions/send-claim-dossier.actions", () => ({
  sendClaimDossierEmail: vi.fn(),
}));

vi.mock("@/features/auth/utils/oauth.utils", () => ({
  generateSecureRandomString: vi.fn(() => "token-abc"),
}));

vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: () => ({ BASE_URL: "http://localhost:3000" }),
}));

import { userRepo, parcoursRepo } from "@/shared/database/repositories";
import { sendClaimDossierEmail } from "@/shared/email/actions/send-claim-dossier.actions";

describe("createDossierByAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepo.createStub).mockResolvedValue({
      id: "user-stub-1",
      fcId: null,
      nom: "Dupont",
      prenom: "Jean",
      email: "jean@ex.fr",
      emailContact: null,
      telephone: "0600000000",
      claimToken: "token-abc",
      claimTokenExpiresAt: new Date(),
      claimedAt: null,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(parcoursRepo.findOrCreateForUser).mockResolvedValue({
      id: "parcours-1",
    } as never);
    vi.mocked(parcoursRepo.updateRGADataAgent).mockResolvedValue({} as never);
    vi.mocked(sendClaimDossierEmail).mockResolvedValue({
      success: true,
      data: { messageId: "msg-1" },
    });
  });

  const baseParams = {
    agentId: "agent-1",
    demandeur: {
      nom: "Dupont",
      prenom: "Jean",
      email: "jean@ex.fr",
      telephone: "0600000000",
    },
    adresseBien: "12 rue des Lilas, Issoudun",
    sendEmail: true,
  };

  it("crée stub + parcours + simulation minimale quand pas de simulation fournie", async () => {
    const result = await createDossierByAgent(baseParams);

    expect(userRepo.createStub).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "jean@ex.fr",
        claimToken: "token-abc",
      })
    );
    expect(parcoursRepo.findOrCreateForUser).toHaveBeenCalledWith("user-stub-1", {
      createdByAgentId: "agent-1",
    });

    const [, simulationData] = vi.mocked(parcoursRepo.updateRGADataAgent).mock.calls[0];
    expect(simulationData.logement.adresse).toBe("12 rue des Lilas, Issoudun");

    expect(result.claimUrl).toBe("http://localhost:3000/claim-dossier/token-abc");
    expect(result.emailSent).toBe(true);
  });

  it("persiste la simulation fournie par l'agent (parcours 2)", async () => {
    const simulationComplete = {
      logement: { adresse: "X", commune: "36100" },
      menage: { revenu_rga: 30000, personnes: 2 },
      simulatedAt: new Date().toISOString(),
    };

    await createDossierByAgent({
      ...baseParams,
      rgaSimulationDataAgent: simulationComplete as never,
    });

    const [, simulationData] = vi.mocked(parcoursRepo.updateRGADataAgent).mock.calls[0];
    expect(simulationData).toEqual(simulationComplete);
  });

  it("ne lance pas l'envoi email si sendEmail=false", async () => {
    const result = await createDossierByAgent({ ...baseParams, sendEmail: false });

    expect(sendClaimDossierEmail).not.toHaveBeenCalled();
    expect(result.emailSent).toBe(false);
  });

  it("emailSent=false si l'envoi échoue", async () => {
    vi.mocked(sendClaimDossierEmail).mockResolvedValue({ success: false, error: "boom" });

    const result = await createDossierByAgent(baseParams);

    expect(result.emailSent).toBe(false);
  });
});
