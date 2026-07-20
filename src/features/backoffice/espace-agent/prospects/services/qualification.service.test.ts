import { describe, it, expect, vi, beforeEach } from "vitest";
import { qualificationService } from "./qualification.service";
import { QualificationDecision } from "../domain/types";
import { prospectQualificationsRepo } from "@/shared/database/repositories/prospect-qualifications.repository";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";

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
