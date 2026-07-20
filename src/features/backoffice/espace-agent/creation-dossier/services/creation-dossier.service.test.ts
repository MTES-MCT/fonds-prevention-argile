import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDossierByAgent } from "./creation-dossier.service";

vi.mock("@/shared/database/repositories", () => ({
  userRepo: {
    createStub: vi.fn(),
  },
  parcoursRepo: {
    findOrCreateForUser: vi.fn(),
    updateRGADataAgent: vi.fn(),
    updateSituationParticulier: vi.fn(),
  },
  agentsRepo: {
    // Par défaut on retourne un agent sans entrepriseAmoId (cas AV pur).
    // Les tests qui veulent tester le chemin AMO peuvent le surcharger.
    findById: vi.fn(async () => ({ id: "agent-1", entrepriseAmoId: null, allersVersId: "av-1" })),
  },
}));

// Mock du service d'éligibilité — par défaut retourne null (sim incomplète) ;
// les tests dédiés au cas non-éligible surchargeront la valeur de retour.
vi.mock("@/features/simulateur/domain/services/eligibility.service", () => ({
  EligibilityService: {
    evaluate: vi.fn(() => ({ result: null, checks: {}, isComplete: false })),
    getReasonMessage: vi.fn(() => "Raison test"),
  },
}));

vi.mock("@/features/backoffice/espace-agent/prospects/services/qualification.service", () => ({
  qualificationService: {
    qualifyProspect: vi.fn(),
  },
}));

// Le service appelle `db.insert(parcoursAmoValidations).values(...).onConflictDoNothing(...)`
// uniquement quand l'agent a un entrepriseAmoId. Stubé pour ne pas appeler
// la BDD dans les tests (par défaut le mock agent ci-dessus court-circuite).
vi.mock("@/shared/database/client", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(async () => undefined),
      })),
    })),
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

vi.mock("./inviter-name.service", () => ({
  getInviterName: vi.fn(async () => "Mairie de Test"),
}));

import { userRepo, parcoursRepo, agentsRepo } from "@/shared/database/repositories";
import { db } from "@/shared/database/client";
import { sendClaimDossierEmail } from "@/shared/email/actions/send-claim-dossier.actions";
import { EligibilityService } from "@/features/simulateur/domain/services/eligibility.service";
import { qualificationService } from "@/features/backoffice/espace-agent/prospects/services/qualification.service";
import { EligibilityReason } from "@/features/simulateur/domain/value-objects/eligibility-reason.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";

describe("createDossierByAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepo.createStub).mockResolvedValue({
      id: "user-stub-1",
      fcId: null,
      nom: "Dupont",
      nomFamille: "Dupont",
      prenom: "Jean",
      email: "jean@ex.fr",
      emailContact: null,
      telephone: "0600000000",
      sourceAcquisition: null,
      sourceAcquisitionPrecision: null,
      partnerSource: null,
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
    expect(simulationData.logement?.adresse).toBe("12 rue des Lilas, Issoudun");

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

  describe("intent=av : pas de claim AMO même si l'agent a un entrepriseAmoId", () => {
    it("skip db.insert(parcoursAmoValidations) quand intent=av", async () => {
      // Agent AMO_ET_ALLERS_VERS : a un entrepriseAmoId, mais entre via /prospects.
      vi.mocked(agentsRepo.findById).mockResolvedValueOnce({
        id: "agent-mixed",
        entrepriseAmoId: "amo-42",
        allersVersId: "av-7",
      } as never);

      const insertSpy = vi.mocked(db.insert);
      insertSpy.mockClear();

      await createDossierByAgent({ ...baseParams, intent: "av" });

      // db.insert n'a pas dû être appelé pour parcoursAmoValidations
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it("appelle db.insert(parcoursAmoValidations) quand intent=amo (défaut)", async () => {
      vi.mocked(agentsRepo.findById).mockResolvedValueOnce({
        id: "agent-amo",
        entrepriseAmoId: "amo-42",
        allersVersId: null,
      } as never);

      const insertSpy = vi.mocked(db.insert);
      insertSpy.mockClear();

      await createDossierByAgent({ ...baseParams, intent: "amo" });

      expect(insertSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("simulation non éligible : auto-archivage + skip mail", () => {
    const simNonEligible = {
      logement: { adresse: "X", type: "appartement" },
      simulatedAt: new Date().toISOString(),
    };

    beforeEach(() => {
      // EligibilityService renvoie eligible: false (raison APPARTEMENT par défaut)
      vi.mocked(EligibilityService.evaluate).mockReturnValue({
        result: {
          eligible: false,
          reason: EligibilityReason.APPARTEMENT,
          determinedAtStep: "type_logement",
          determinedAt: new Date().toISOString(),
          checks: {} as never,
        },
        checks: {} as never,
        isComplete: true,
      });
    });

    it("intent=av non éligible : appelle qualifyProspect + skip mail", async () => {
      const result = await createDossierByAgent({
        ...baseParams,
        intent: "av",
        rgaSimulationDataAgent: simNonEligible as never,
      });

      expect(qualificationService.qualifyProspect).toHaveBeenCalledWith(
        expect.objectContaining({
          parcoursId: "parcours-1",
          agentId: "agent-1",
          decision: QualificationDecision.NON_ELIGIBLE,
          raisonsIneligibilite: ["appartement"],
        })
      );
      expect(parcoursRepo.updateSituationParticulier).not.toHaveBeenCalled();
      expect(sendClaimDossierEmail).not.toHaveBeenCalled();
      expect(result.emailSent).toBe(false);
    });

    it("intent=amo non éligible : insert validation NON_ELIGIBLE + updateSituationParticulier(ARCHIVE) + skip mail", async () => {
      vi.mocked(agentsRepo.findById).mockResolvedValueOnce({
        id: "agent-amo",
        entrepriseAmoId: "amo-42",
        allersVersId: null,
      } as never);

      const insertSpy = vi.mocked(db.insert);
      insertSpy.mockClear();

      const result = await createDossierByAgent({
        ...baseParams,
        intent: "amo",
        rgaSimulationDataAgent: simNonEligible as never,
      });

      // Validation AMO créée
      expect(insertSpy).toHaveBeenCalledTimes(1);
      // Parcours archivé
      expect(parcoursRepo.updateSituationParticulier).toHaveBeenCalledWith(
        "parcours-1",
        SituationParticulier.ARCHIVE,
        expect.stringContaining("Non éligible"),
        "agent-1"
      );
      // qualifyProspect NON appelé (c'est le chemin AV)
      expect(qualificationService.qualifyProspect).not.toHaveBeenCalled();
      // Mail skipé
      expect(sendClaimDossierEmail).not.toHaveBeenCalled();
      expect(result.emailSent).toBe(false);
    });

    it("persiste une simulation partielle (early exit) sans perdre le rattachement territorial", async () => {
      // Simulation coupée juste après l'adresse : ni revenus, ni assurance, etc.
      const simPartielle = {
        logement: { adresse: "X", type: "appartement", code_departement: "16", commune: "16015" },
        simulatedAt: new Date().toISOString(),
      };

      const result = await createDossierByAgent({
        ...baseParams,
        intent: "av",
        rgaSimulationDataAgent: simPartielle as never,
      });

      const [, simulationData] = vi.mocked(parcoursRepo.updateRGADataAgent).mock.calls[0];
      expect(simulationData.logement?.code_departement).toBe("16");
      expect(simulationData.logement?.commune).toBe("16015");

      expect(qualificationService.qualifyProspect).toHaveBeenCalledWith(
        expect.objectContaining({ decision: QualificationDecision.NON_ELIGIBLE })
      );
      expect(result.emailSent).toBe(false);
    });
  });
});
