import { describe, it, expect, vi, beforeEach } from "vitest";
import { qualificationService } from "./qualification.service";
import { QualificationDecision } from "../domain/types";
import { prospectQualificationsRepo } from "@/shared/database/repositories/prospect-qualifications.repository";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { assignAmoAutomatiqueForUser } from "@/features/parcours/amo/services/amo-selection.service";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";

vi.mock("@/shared/database/repositories/prospect-qualifications.repository", () => ({
  prospectQualificationsRepo: {
    create: vi.fn(),
  },
}));

vi.mock("@/shared/database/repositories/parcours-prevention.repository", () => ({
  parcoursPreventionRepository: {
    findById: vi.fn(),
    updateSituationParticulier: vi.fn(),
  },
}));

vi.mock("@/features/parcours/amo/services/amo-selection.service", () => ({
  assignAmoAutomatiqueForUser: vi.fn(async () => ({ success: true, data: { message: "AMO liée", token: "t" } })),
}));

describe("qualificationService.qualifyProspect", () => {
  const parcoursId = "parcours-123";
  const agentId = "agent-456";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue({ id: parcoursId } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prospectQualificationsRepo.create).mockImplementation(async (data: any) => data);
  });

  it("persiste estMandataireFinancier=true quand la décision est éligible", async () => {
    await qualificationService.qualifyProspect({
      parcoursId,
      agentId,
      decision: QualificationDecision.ELIGIBLE,
      estMandataireFinancier: true,
      note: "Projet motivé",
    });

    expect(prospectQualificationsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ estMandataireFinancier: true, note: "Projet motivé" })
    );
  });

  it("met estMandataireFinancier à null quand non renseigné", async () => {
    await qualificationService.qualifyProspect({
      parcoursId,
      agentId,
      decision: QualificationDecision.A_QUALIFIER,
    });

    expect(prospectQualificationsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ estMandataireFinancier: null })
    );
  });
});

describe("qualificationService.qualifyProspect — auto-lien AMO (dépt obligatoire)", () => {
  // Commune en dept 03 (Allier) = AMO obligatoire par défaut ; dept 59 (Nord) = facultatif.
  function mockParcours(commune: string) {
    return {
      id: "parcours-1",
      userId: "user-1",
      rgaSimulationData: { logement: { commune } },
      rgaSimulationDataAgent: null,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prospectQualificationsRepo.create).mockImplementation(async (data: any) => data);
  });

  it("met le dossier en lien direct avec l'AMO quand l'Aller-vers qualifie éligible en dépt obligatoire", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours("03185") as never);

    await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.ELIGIBLE,
    });

    expect(parcoursPreventionRepository.updateSituationParticulier).toHaveBeenCalledWith(
      "parcours-1",
      SituationParticulier.ELIGIBLE
    );
    expect(assignAmoAutomatiqueForUser).toHaveBeenCalledWith("user-1");
  });

  it("ne crée PAS de lien AMO en dépt facultatif (le ménage choisit lui-même)", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours("59350") as never);

    await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.ELIGIBLE,
    });

    expect(assignAmoAutomatiqueForUser).not.toHaveBeenCalled();
  });

  it("ne crée PAS de lien AMO pour une décision non éligible", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours("03185") as never);

    await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.NON_ELIGIBLE,
      raisonsIneligibilite: ["autre"],
    });

    expect(assignAmoAutomatiqueForUser).not.toHaveBeenCalled();
  });

  it("n'échoue pas la qualification si l'auto-lien AMO échoue (best-effort)", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours("03185") as never);
    vi.mocked(assignAmoAutomatiqueForUser).mockResolvedValueOnce({ success: false, error: "boom" });

    const qualification = await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.ELIGIBLE,
    });

    expect(qualification).toMatchObject({ decision: QualificationDecision.ELIGIBLE });
  });
});
