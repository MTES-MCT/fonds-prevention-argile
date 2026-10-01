import { describe, it, expect, vi, beforeEach } from "vitest";

// La garde d'accès a sa propre suite (acces-espace-agent.service.test.ts) : ici l'agent est admis.
vi.mock("@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service", () => ({
  refusAccesEspaceAgent: vi.fn().mockResolvedValue(null),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({ parcoursRepo: { findById: vi.fn() } }));
vi.mock("@/features/backoffice/espace-agent/shared/services/action-audit.service", () => ({
  logSystemAction: vi.fn(),
}));
vi.mock("@/features/parcours/amo/services/formulaire-par-amo.service", () => ({
  chargerEtatFormulaireParAmo: vi.fn(),
}));
vi.mock("@/features/parcours/core/services/diagnostic.service", () => ({ createDiagnosticDossier: vi.fn() }));
vi.mock("@/shared/email/brevo", () => ({
  emitBrevoEvent: vi.fn(),
  BREVO_EVENTS: { DEMANDE_PAIEMENT_INITIEE_PAR_AMO: "demande_paiement_initiee_par_amo" },
}));

import { initierFormulaireDiagnosticAction } from "./initier-formulaire-diagnostic.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import { chargerEtatFormulaireParAmo } from "@/features/parcours/amo/services/formulaire-par-amo.service";
import { createDiagnosticDossier } from "@/features/parcours/core/services/diagnostic.service";
import { parcoursRepo } from "@/shared/database/repositories";
import { UserRole } from "@/shared/domain/value-objects";
import { INITIATEUR_FORMULAIRE } from "@/shared/domain/value-objects/initiateur-formulaire.enum";
import { emitBrevoEvent } from "@/shared/email/brevo";

const PARCOURS = "11111111-1111-4111-8111-111111111111";
const URL_DN = "https://ds.test/commencer/x?prefill_token=y";

function mockAgent(role: UserRole, entrepriseAmoId: string | null = "entreprise-1") {
  vi.mocked(getCurrentAgent).mockResolvedValue({
    success: true,
    data: { id: "agent-1", role, entrepriseAmoId },
  } as never);
}

function mockCreation(cree: boolean) {
  vi.mocked(createDiagnosticDossier).mockResolvedValue({
    success: true,
    data: { cree, dossierUrl: URL_DN, dossierNumber: 42, dossierId: "d1", message: "" },
  });
}

describe("initierFormulaireDiagnosticAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAgent(UserRole.AMO);
    mockCreation(true);
    vi.mocked(parcoursRepo.findById).mockResolvedValue({ id: PARCOURS, userId: "user-1", archivedAt: null } as never);
    vi.mocked(chargerEtatFormulaireParAmo).mockResolvedValue({
      confie: true,
      gereParAmo: true,
      formulaire: null,
      entrepriseAmoId: "entreprise-1",
      amoNom: "SOLHA Indre",
    });
  });

  it("crée le formulaire au nom de l'AMO, trace l'action et prévient Brevo", async () => {
    const result = await initierFormulaireDiagnosticAction(PARCOURS);

    expect(result).toEqual({ success: true, data: { dossierUrl: URL_DN } });
    expect(createDiagnosticDossier).toHaveBeenCalledWith("user-1", INITIATEUR_FORMULAIRE.AMO);
    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({ parcoursId: PARCOURS, actionType: "formulaire_initie_par_amo" })
    );
    expect(emitBrevoEvent).toHaveBeenCalledWith(
      PARCOURS,
      "demande_paiement_initiee_par_amo",
      expect.objectContaining({ eventProperties: { step: "diagnostic", amo_nom: "SOLHA Indre" } })
    );
  });

  // Un second clic ne doit ni doubler la trace ni renvoyer un mail au demandeur.
  it("rend le lien existant sans trace ni évènement quand le formulaire est déjà créé", async () => {
    mockCreation(false);

    const result = await initierFormulaireDiagnosticAction(PARCOURS);

    expect(result.success).toBe(true);
    expect(logSystemAction).not.toHaveBeenCalled();
    expect(emitBrevoEvent).not.toHaveBeenCalled();
  });

  it.each([UserRole.ALLERS_VERS, UserRole.ANALYSTE, UserRole.ADMINISTRATEUR, UserRole.SUPER_ADMINISTRATEUR])(
    "refuse le rôle %s",
    async (role) => {
      mockAgent(role);

      const result = await initierFormulaireDiagnosticAction(PARCOURS);

      expect(result.success).toBe(false);
      expect(createDiagnosticDossier).not.toHaveBeenCalled();
    }
  );

  it("refuse l'agent d'une autre entreprise AMO", async () => {
    mockAgent(UserRole.AMO, "entreprise-2");

    const result = await initierFormulaireDiagnosticAction(PARCOURS);

    expect(result.success).toBe(false);
    expect(createDiagnosticDossier).not.toHaveBeenCalled();
  });

  it("refuse un AMO sans entreprise sur un dossier sans AMO", async () => {
    mockAgent(UserRole.AMO, null);
    vi.mocked(chargerEtatFormulaireParAmo).mockResolvedValue({
      confie: false,
      gereParAmo: false,
      formulaire: null,
      entrepriseAmoId: null,
      amoNom: null,
    });

    const result = await initierFormulaireDiagnosticAction(PARCOURS);

    expect(result.success).toBe(false);
    expect(createDiagnosticDossier).not.toHaveBeenCalled();
  });

  it("refuse sur un dossier archivé", async () => {
    vi.mocked(parcoursRepo.findById).mockResolvedValue({
      id: PARCOURS,
      userId: "user-1",
      archivedAt: new Date(),
    } as never);

    const result = await initierFormulaireDiagnosticAction(PARCOURS);

    expect(result.success).toBe(false);
    expect(createDiagnosticDossier).not.toHaveBeenCalled();
  });

  it("refuse un identifiant qui n'est pas un uuid, sans requête", async () => {
    const result = await initierFormulaireDiagnosticAction("1 OR 1=1");

    expect(result.success).toBe(false);
    expect(parcoursRepo.findById).not.toHaveBeenCalled();
  });

  it("remonte le refus du service sans trace ni évènement", async () => {
    vi.mocked(createDiagnosticDossier).mockResolvedValue({
      success: false,
      error: "Le demandeur a déjà transmis ce formulaire.",
    });

    const result = await initierFormulaireDiagnosticAction(PARCOURS);

    expect(result).toEqual({ success: false, error: "Le demandeur a déjà transmis ce formulaire." });
    expect(logSystemAction).not.toHaveBeenCalled();
    expect(emitBrevoEvent).not.toHaveBeenCalled();
  });
});
