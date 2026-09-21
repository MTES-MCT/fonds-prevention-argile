import { describe, it, expect, vi, beforeEach } from "vitest";
import { qualificationService } from "./qualification.service";
import { QualificationDecision } from "../domain/types";
import { prospectQualificationsRepo } from "@/shared/database/repositories/prospect-qualifications.repository";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { assignAmoAutomatiqueForUser } from "@/features/parcours/amo/services/amo-selection.service";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import {
  ACTION_TYPE_AV_QUALIFICATION_ELIGIBLE,
  ACTION_TYPE_AV_QUALIFICATION_A_QUALIFIER,
  ACTION_TYPE_AV_QUALIFICATION_NON_ELIGIBLE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";

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
  passerEnAutonomie: vi.fn(async () => ({ success: true, data: { message: "autonomie" } })),
}));

vi.mock("@/features/parcours/amo/services/ouverture-eligibilite.service", () => ({
  ouvrirEligibiliteApresValidationAmo: vi.fn(async () => true),
}));

vi.mock("@/features/parcours/amo/services/amo-query.service", () => ({
  checkAmoCoversCodeInsee: vi.fn(async () => true),
}));

vi.mock("@/shared/database/repositories", () => ({
  entreprisesAmoRepo: { findById: vi.fn(async () => null) },
}));

vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
}));

// Insertion de la validation par la voie fusionnée (aller-vers qui est aussi l'AMO).
const insertReturning = vi.fn(async () => [{ id: "validation-1" }]);
vi.mock("@/shared/database/client", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({ returning: insertReturning })),
      })),
    })),
  },
}));

vi.mock("@/features/backoffice/espace-agent/shared/services/action-audit.service", () => ({
  logSystemAction: vi.fn(async () => true),
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

describe("qualificationService.qualifyProspect — audit de la réponse Aller-vers", () => {
  const parcoursId = "parcours-123";
  const agentId = "agent-456";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue({
      id: parcoursId,
      userId: "user-1",
      rgaSimulationData: { logement: { commune: "03185" } },
      rgaSimulationDataAgent: null,
    } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prospectQualificationsRepo.create).mockImplementation(async (data: any) => data);
  });

  it("trace la qualification éligible avec l'engagement de mandataire financier et la suite donnée", async () => {
    await qualificationService.qualifyProspect({
      parcoursId,
      agentId,
      decision: QualificationDecision.ELIGIBLE,
      estMandataireFinancier: true,
      note: "Visite faite le 12/08",
    });

    expect(logSystemAction).toHaveBeenCalledWith({
      parcoursId,
      author: { agentId },
      actionType: ACTION_TYPE_AV_QUALIFICATION_ELIGIBLE,
      message: "Mandataire financier : oui — Visite faite le 12/08 Dossier transmis à l'AMO du territoire.",
    });
  });

  it("trace la qualification non éligible avec les raisons en clair", async () => {
    await qualificationService.qualifyProspect({
      parcoursId,
      agentId,
      decision: QualificationDecision.NON_ELIGIBLE,
      raisonsIneligibilite: ["appartement", "autre:sinistre non RGA"],
    });

    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: ACTION_TYPE_AV_QUALIFICATION_NON_ELIGIBLE,
        message: "Raisons : Appartement, Autre : sinistre non RGA",
      })
    );
  });

  it("trace la décision « à qualifier » sans message quand aucune note n'est saisie", async () => {
    await qualificationService.qualifyProspect({
      parcoursId,
      agentId,
      decision: QualificationDecision.A_QUALIFIER,
    });

    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: ACTION_TYPE_AV_QUALIFICATION_A_QUALIFIER, message: null })
    );
  });
});

describe("qualificationService.qualifyProspect — auto-lien AMO (dépt obligatoire)", () => {
  // Commune en dept 03 (Allier) = AMO obligatoire par défaut ; dept 59 (Nord) = facultatif.
  function mockParcours(commune: string | null) {
    return {
      id: "parcours-1",
      userId: "user-1",
      rgaSimulationData: commune ? { logement: { commune } } : null,
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

  it("n'invalide pas la qualification quand la transmission échoue : la décision reste enregistrée", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours("03185") as never);
    vi.mocked(assignAmoAutomatiqueForUser).mockResolvedValueOnce({ success: false, error: "boom" });

    const { qualification } = await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.ELIGIBLE,
    });

    expect(qualification).toMatchObject({ decision: QualificationDecision.ELIGIBLE });
  });

  it("remonte l'échec de transmission à l'agent au lieu de le journaliser en silence", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours("03185") as never);
    vi.mocked(assignAmoAutomatiqueForUser).mockResolvedValueOnce({ success: false, error: "Aucun AMO disponible" });

    const { suiteAccompagnement } = await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.ELIGIBLE,
    });

    expect(suiteAccompagnement).toEqual({ issue: "echec", raison: "Aucun AMO disponible" });
  });

  it("confirme la transmission quand l'AMO a bien été sollicitée", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours("03185") as never);
    vi.mocked(assignAmoAutomatiqueForUser).mockResolvedValueOnce({
      success: true,
      data: { message: "AMO sélectionnée avec succès", token: "t" },
    });

    const { suiteAccompagnement } = await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.ELIGIBLE,
    });

    expect(suiteAccompagnement).toMatchObject({ issue: "transmise" });
  });

  it("ne transmet pas dans un département où l'AMO est facultatif", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours("82013") as never);

    const { suiteAccompagnement } = await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.ELIGIBLE,
    });

    expect(suiteAccompagnement).toMatchObject({ issue: "laissee_au_demandeur" });
    expect(assignAmoAutomatiqueForUser).not.toHaveBeenCalled();
  });

  it("signale une commune inconnue au lieu de transmettre à l'aveugle", async () => {
    vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(mockParcours(null) as never);

    const { suiteAccompagnement } = await qualificationService.qualifyProspect({
      parcoursId: "parcours-1",
      agentId: "agent-1",
      decision: QualificationDecision.ELIGIBLE,
    });

    expect(suiteAccompagnement).toMatchObject({ issue: "echec" });
    expect(assignAmoAutomatiqueForUser).not.toHaveBeenCalled();
  });
});

// Sujet 1 — là où l'Aller-vers et l'AMO sont la même structure, la qualification EST la
// validation AMO : plus de second tour, plus d'email, accès direct au formulaire.
describe("qualification Aller-vers valant validation AMO (départements à cumul)", () => {
  it.todo("laisse le parcours à l'étape invitation tant que le demandeur n'a pas réclamé son dossier");
  it.todo("trace une acceptation d'éligibilité distincte de la qualification, avec l'agent et son entreprise");

  it.todo("ne réactive pas un dossier archivé ni un parcours déjà au diagnostic");
});

// Sujet 2 — la qualification éligible vaut demande d'accompagnement : le demandeur n'a jamais
// à la formuler, et la transmission ne dépend pas de sa venue sur son espace.
describe("transmission à l'AMO dès la qualification (départements à AMO obligatoire)", () => {
  it.todo("transmet un dossier encore à l'étape invitation, avant que le demandeur ait réclamé son compte");
  it.todo("transmet un dossier dont seule la simulation de l'agent porte la commune");
  it.todo("n'exige pas le téléphone du demandeur, absent des dossiers créés par un Aller-vers");

  it.todo("ne transmet pas sur une décision « à qualifier » ou « non éligible »");
  it.todo("ne recrée ni validation ni token quand une validation existe déjà");
  it.todo("ne remet jamais en attente une AMO qui a déjà rendu sa décision");
});

// Sujet 3 — l'Aller-vers tranche quand le demandeur ne l'a pas fait ; un choix déjà exprimé
// par le demandeur prime toujours sur la qualification.
describe("l'Aller-vers tranche l'accompagnement (départements à AMO facultatif)", () => {
  it.todo("autonomie : résout le département même quand seule la simulation de l'agent porte la commune");
  it.todo("trace la décision avec l'agent comme auteur, jamais le demandeur");

  it.todo("refuse de changer l'accompagnement pendant que la DDT tient le formulaire d'éligibilité");
  it.todo("refuse sur un dossier archivé");
});
