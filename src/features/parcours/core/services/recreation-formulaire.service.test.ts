import { describe, it, expect, vi, beforeEach } from "vitest";
import { recreerFormulaireDemandeur } from "./recreation-formulaire.service";
import { reinitialiserDossierEtape } from "../../dossiers-ds/services/regeneration.service";
import { createEligibiliteDossier } from "./eligibilite.service";
import { createDiagnosticDossier } from "./diagnostic.service";
import { createDevisDossier } from "./devis.service";
import { parcoursRepo } from "@/shared/database/repositories";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("@/shared/database/repositories", () => ({ parcoursRepo: { findByUserId: vi.fn() } }));
vi.mock("../../dossiers-ds/services/regeneration.service", () => ({ reinitialiserDossierEtape: vi.fn() }));
vi.mock("./eligibilite.service", () => ({ createEligibiliteDossier: vi.fn() }));
vi.mock("./diagnostic.service", () => ({ createDiagnosticDossier: vi.fn() }));
vi.mock("./devis.service", () => ({ createDevisDossier: vi.fn() }));

const SIMULATION = { logement: { adresse: "1 rue des Argiles" } };

function mockParcours(step: Step, rga: Record<string, unknown> | null = SIMULATION) {
  vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({
    id: "parcours-1",
    currentStep: step,
    rgaSimulationData: rga,
    rgaSimulationDataAgent: null,
  } as never);
}

const URL_DN = "https://demarche.numerique.gouv.fr/commencer/x?prefill_token=y";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(reinitialiserDossierEtape).mockResolvedValue({
    success: true,
    data: { statut: "a_recreer", ancienDsNumber: "32872663" },
  });
  vi.mocked(createEligibiliteDossier).mockResolvedValue({
    success: true,
    data: { dossierUrl: URL_DN, dossierNumber: 1, dossierId: "d1", message: "" },
  });
});

describe("recreerFormulaireDemandeur", () => {
  it("réinitialise en forcé : la confirmation en modale remplace la fenêtre anti-rafale", async () => {
    mockParcours(Step.ELIGIBILITE);

    await recreerFormulaireDemandeur("user-1", Step.ELIGIBILITE);

    expect(reinitialiserDossierEtape).toHaveBeenCalledWith("parcours-1", Step.ELIGIBILITE, { force: true });
  });

  it("enchaîne la création du prérempli et renvoie son URL", async () => {
    mockParcours(Step.ELIGIBILITE);

    const result = await recreerFormulaireDemandeur("user-1", Step.ELIGIBILITE);

    expect(result).toEqual({
      success: true,
      data: { statut: "recree", dossierUrl: URL_DN, ancienDsNumber: "32872663", step: Step.ELIGIBILITE },
    });
  });

  // C'est tout l'objet du service : le CTA principal lisait la simulation dans le store du
  // navigateur, vide dès que le dossier vient d'un Aller-vers.
  it("lit la simulation en base, pas côté client", async () => {
    mockParcours(Step.ELIGIBILITE);

    await recreerFormulaireDemandeur("user-1", Step.ELIGIBILITE);

    expect(createEligibiliteDossier).toHaveBeenCalledWith("user-1", SIMULATION);
  });

  it("refuse sans rien créer quand aucune simulation n'est enregistrée", async () => {
    mockParcours(Step.ELIGIBILITE, null);

    const result = await recreerFormulaireDemandeur("user-1", Step.ELIGIBILITE);

    expect(result.success).toBe(false);
    expect(createEligibiliteDossier).not.toHaveBeenCalled();
  });

  it.each([
    [Step.DIAGNOSTIC, createDiagnosticDossier],
    [Step.DEVIS, createDevisDossier],
  ])("recrée aussi le formulaire de l'étape %s", async (step, service) => {
    mockParcours(step);
    vi.mocked(service).mockResolvedValue({
      success: true,
      data: { dossierUrl: URL_DN, dossierNumber: 2, dossierId: "d2", message: "" },
    });

    const result = await recreerFormulaireDemandeur("user-1", step);

    expect(service).toHaveBeenCalledWith("user-1");
    expect(result.success && result.data.statut).toBe("recree");
  });

  it("ne crée rien quand un ancien numéro a été retrouvé déposé", async () => {
    mockParcours(Step.ELIGIBILITE);
    vi.mocked(reinitialiserDossierEtape).mockResolvedValue({
      success: true,
      data: { statut: "rattache", dsNumber: "32052358" },
    });

    const result = await recreerFormulaireDemandeur("user-1", Step.ELIGIBILITE);

    expect(createEligibiliteDossier).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      data: { statut: "rattache", dsNumber: "32052358", step: Step.ELIGIBILITE },
    });
  });

  // Le callout affiché n'est pas toujours celui de l'étape en cours : un diagnostic accepté
  // rend déjà le CTA devis.
  it("refuse une étape qui n'est pas celle du parcours, sans rien réinitialiser", async () => {
    mockParcours(Step.DIAGNOSTIC);

    const result = await recreerFormulaireDemandeur("user-1", Step.DEVIS);

    expect(result.success).toBe(false);
    expect(reinitialiserDossierEtape).not.toHaveBeenCalled();
  });

  it("propage le refus de la réinitialisation sans rien créer", async () => {
    mockParcours(Step.ELIGIBILITE);
    vi.mocked(reinitialiserDossierEtape).mockResolvedValue({ success: false, error: "Votre dossier a été transmis" });

    const result = await recreerFormulaireDemandeur("user-1", Step.ELIGIBILITE);

    expect(result).toEqual({ success: false, error: "Votre dossier a été transmis" });
    expect(createEligibiliteDossier).not.toHaveBeenCalled();
  });

  // Le pointeur est déjà parti : le message doit dire où on en est, pas seulement « erreur ».
  it("dit que le lien a été retiré quand la création échoue", async () => {
    mockParcours(Step.ELIGIBILITE);
    vi.mocked(createEligibiliteDossier).mockResolvedValue({ success: false, error: "Réponse invalide de DN" });

    const result = await recreerFormulaireDemandeur("user-1", Step.ELIGIBILITE);

    expect(result.success).toBe(false);
    expect(!result.success && result.error).toContain("retiré");
    expect(!result.success && result.error).toContain("Réponse invalide de DN");
  });
});
