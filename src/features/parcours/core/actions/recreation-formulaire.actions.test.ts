import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSession } from "@/features/auth/server";
import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import {
  ACTION_TYPE_DOSSIER_DN_RATTACHE,
  ACTION_TYPE_DOSSIER_DN_REINITIALISE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { recreerFormulaireDemandeur } from "../services/recreation-formulaire.service";
import { recreerFormulaireAction } from "./recreation-formulaire.actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findByUserId: vi.fn() },
  userRepo: { findById: vi.fn() },
}));
vi.mock("../services/recreation-formulaire.service", () => ({ recreerFormulaireDemandeur: vi.fn() }));
vi.mock("@/features/backoffice/espace-agent/shared/services/action-audit.service", () => ({
  logSystemAction: vi.fn(),
}));

const mockedService = vi.mocked(recreerFormulaireDemandeur);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSession).mockResolvedValue({ userId: "u1" } as never);
  vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({ id: "p1" } as never);
  vi.mocked(userRepo.findById).mockResolvedValue({ prenom: "Marie", nom: "Durand" } as never);
  mockedService.mockResolvedValue({
    success: true,
    data: { statut: "recree", dossierUrl: "https://dn/x", ancienDsNumber: "32872663", step: Step.ELIGIBILITE },
  });
});

describe("recreerFormulaireAction", () => {
  it("refuse un appel non authentifié sans toucher au parcours", async () => {
    vi.mocked(getSession).mockResolvedValue(null as never);

    const result = await recreerFormulaireAction(Step.ELIGIBILITE);

    expect(result.success).toBe(false);
    expect(mockedService).not.toHaveBeenCalled();
  });

  it("résout le parcours par la session, jamais par un identifiant du client", async () => {
    await recreerFormulaireAction(Step.ELIGIBILITE);

    expect(mockedService).toHaveBeenCalledWith("u1", Step.ELIGIBILITE);
  });

  it("trace la recréation au nom du demandeur", async () => {
    await recreerFormulaireAction(Step.ELIGIBILITE);

    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({
        parcoursId: "p1",
        author: { demandeur: { nom: "Marie Durand" } },
        actionType: ACTION_TYPE_DOSSIER_DN_REINITIALISE,
      })
    );
  });

  it("trace un rattachement quand un ancien numéro avait été déposé", async () => {
    mockedService.mockResolvedValue({
      success: true,
      data: { statut: "rattache", dsNumber: "32052358", step: Step.ELIGIBILITE },
    });

    await recreerFormulaireAction(Step.ELIGIBILITE);

    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: ACTION_TYPE_DOSSIER_DN_RATTACHE })
    );
  });

  // Le formulaire est déjà recréé : un audit en échec ne doit pas se présenter au demandeur
  // comme une création ratée.
  it("reste un succès si l'audit échoue", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockRejectedValue(new Error("base indisponible"));

    const result = await recreerFormulaireAction(Step.ELIGIBILITE);

    expect(result.success).toBe(true);
  });

  it("ne trace rien quand le service refuse", async () => {
    mockedService.mockResolvedValue({ success: false, error: "Votre dossier a déjà été transmis" });

    const result = await recreerFormulaireAction(Step.ELIGIBILITE);

    expect(result.success).toBe(false);
    expect(logSystemAction).not.toHaveBeenCalled();
  });
});
