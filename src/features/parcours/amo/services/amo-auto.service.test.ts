import { describe, it, expect, vi, beforeEach } from "vitest";
import { assignAmoAutomatiqueForUser, skipAmoStepForUser } from "./amo-selection.service";
import { db } from "@/shared/database/client";
import { parcoursRepo } from "@/shared/database/repositories";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { Status, Step } from "../../core";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";

vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: {
    findByUserId: vi.fn(),
    updateStatus: vi.fn(),
    updateStep: vi.fn(),
  },
}));

vi.mock("@/shared/email/actions/send-email.actions", () => ({
  sendValidationAmoEmail: vi.fn(),
}));

vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "mock-uuid-token"),
});

const userId = "user-123";

function buildMockParcours(codeInsee: string, codeEpci: string = "") {
  return {
    id: "parcours-789",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    userId,
    currentStep: Step.CHOIX_AMO,
    currentStatus: Status.TODO,
    completedAt: null,
    rgaSimulationData: {
      logement: {
        commune: codeInsee,
        adresse: "123 rue test",
        code_region: "11",
        code_departement: codeInsee.substring(0, 2),
        epci: codeEpci,
        commune_nom: "Test",
        coordonnees: "0,0",
        clef_ban: "test",
        commune_denormandie: false,
        annee_de_construction: "1990",
        rnb: "RNB_TEST",
        niveaux: 2,
        zone_dexposition: "moyen" as const,
        type: "maison" as const,
        mitoyen: false,
        proprietaire_occupant: true,
      },
      taxeFonciere: { commune_eligible: true },
      rga: {
        assure: true,
        indemnise_indemnise_rga: false,
        sinistres: "saine" as const,
        indemnise_montant_indemnite: 0,
      },
      menage: { revenu_rga: 35000, personnes: 4 },
      vous: { proprietaire_condition: true, proprietaire_occupant_rga: true },
      simulatedAt: new Date().toISOString(),
    },
    rgaSimulationCompletedAt: new Date(),
    rgaDataDeletedAt: null,
    rgaDataDeletionReason: null,
    situationParticulier: SituationParticulier.PROSPECT,
    rgaSimulationDataAgent: null,
    rgaSimulationAgentEditedAt: null,
    rgaSimulationAgentEditedBy: null,
    archivedAt: null,
    archiveReason: null,
    archivedBy: null,
  };
}

describe("assignAmoAutomatiqueForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse si le parcours n'existe pas", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(null);
    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({ success: false, error: "Parcours non trouvé" });
  });

  it("refuse si le parcours n'est plus à l'étape CHOIX_AMO", async () => {
    const parcours = buildMockParcours("36001");
    parcours.currentStep = Step.ELIGIBILITE;
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({ success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" });
  });

  it("est idempotent si une validation existe déjà", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));
    // Premier select : la validation existante
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "existing-validation" }]),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({ success: true, data: { message: "AMO déjà attribuée", token: "" } });
    // selectAmoForUser ne doit pas avoir été appelée → pas d'envoi d'email
    expect(sendValidationAmoEmail).not.toHaveBeenCalled();
  });

  it("auto-attribue aussi en mode FACULTATIF (utilisé par CalloutChoixAccompagnement après 'Oui')", async () => {
    // En mode FACULTATIF, la fonction est appelée explicitement après que l'utilisateur a
    // confirmé "Oui" dans le callout de choix. On prend le 1er AMO du territoire (skip de
    // l'étape liste de sélection manuelle).
    // Ici le dept 82 n'a aucun AMO → on doit sortir avec l'erreur générique "aucun AMO disponible"
    // (et PAS avec une erreur de mode).
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      // 1er select : validation existante → aucune
      // 2e select : recherche AMO par département → aucun
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({
      success: false,
      error: "Aucun AMO disponible pour le territoire du demandeur",
    });
    expect(selectCallCount).toBeGreaterThan(1); // ne sort plus au check de mode
  });

  it("refuse si aucun AMO ne couvre le territoire (dept obligatoire 36)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Validation existante : aucune
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      // Recherche AMO par département : aucun
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({
      success: false,
      error: "Aucun AMO disponible pour le territoire du demandeur",
    });
  });
});

describe("skipAmoStepForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse si le parcours n'existe pas", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(null);
    const result = await skipAmoStepForUser(userId);
    expect(result).toEqual({ success: false, error: "Parcours non trouvé" });
  });

  it("refuse si le parcours n'est plus à CHOIX_AMO/TODO", async () => {
    const parcours = buildMockParcours("82001");
    parcours.currentStatus = Status.EN_INSTRUCTION;
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    const result = await skipAmoStepForUser(userId);
    expect(result).toEqual({ success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" });
  });

  it("refuse en mode OBLIGATOIRE (ex. dept 36)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));
    const result = await skipAmoStepForUser(userId);
    expect(result).toEqual({ success: false, error: "L'AMO est obligatoire pour ce département" });
  });

  it("refuse en mode AV_AMO_FUSIONNES (ex. dept 54)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("54001"));
    const result = await skipAmoStepForUser(userId);
    expect(result).toEqual({ success: false, error: "L'AMO est obligatoire pour ce département" });
  });

  it("avance le parcours à ELIGIBILITE en mode FACULTATIF (ex. dept 82)", async () => {
    const parcours = buildMockParcours("82001");
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    vi.mocked(parcoursRepo.updateStep).mockResolvedValue(parcours);

    const insertValuesMock = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    });
    vi.mocked(db.insert).mockReturnValue({
      values: insertValuesMock,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await skipAmoStepForUser(userId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Parcours avancé à l'étape éligibilité sans AMO");
    }
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parcoursId: parcours.id,
        entrepriseAmoId: null,
        statut: "sans_amo",
        attributionMode: "aucun",
      })
    );
    expect(parcoursRepo.updateStep).toHaveBeenCalledWith(parcours.id, Step.ELIGIBILITE, Status.TODO);
  });
});
