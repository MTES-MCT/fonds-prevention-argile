import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDiagnosticDossier } from "./diagnostic.service";
import { getParcoursComplet } from "./parcours-state.service";
import { prefillClient } from "../../dossiers-ds/adapters";
import { createDossierForCurrentStep, getDossierByStep } from "../../dossiers-ds/services";
import { chargerEtatFormulaireParAmo } from "../../amo/services/formulaire-par-amo.service";
import { parcoursRepo } from "@/shared/database";
import { INITIATEUR_FORMULAIRE } from "@/shared/domain/value-objects/initiateur-formulaire.enum";
import { Status } from "../domain/value-objects/status";
import { Step } from "../domain/value-objects/step";
import { DS_FIELD_IDS } from "../../dossiers-ds/domain/value-objects/ds-field-ids";

vi.mock("./parcours-state.service", () => ({ getParcoursComplet: vi.fn() }));
vi.mock("../../dossiers-ds/adapters", () => ({
  prefillClient: { createPrefillDossier: vi.fn(), getDemarcheId: vi.fn(() => "150267") },
}));
vi.mock("../../dossiers-ds/services", () => ({ createDossierForCurrentStep: vi.fn(), getDossierByStep: vi.fn() }));
vi.mock("../../amo/services/formulaire-par-amo.service", () => ({ chargerEtatFormulaireParAmo: vi.fn() }));
vi.mock("@/shared/database", () => ({ parcoursRepo: { updateStatus: vi.fn(), findById: vi.fn() } }));
vi.mock("@/shared/config/env.config", () => ({ getServerEnv: vi.fn(() => ({ BASE_URL: "https://app.test" })) }));

const URL_DN = "https://ds.test/commencer/x?prefill_token=y";
const brouillon = (initiePar: "amo" | "demandeur", depose = false) => ({ initiePar, depose });

function mockEtat(etat: { confie: boolean; gereParAmo: boolean; formulaire?: ReturnType<typeof brouillon> | null }) {
  vi.mocked(chargerEtatFormulaireParAmo).mockResolvedValue({
    formulaire: null,
    entrepriseAmoId: "entreprise-1",
    amoNom: "SOLHA",
    ...etat,
  });
}

describe("createDiagnosticDossier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getParcoursComplet).mockResolvedValue({
      parcours: { id: "parcours-1", currentStep: Step.DIAGNOSTIC, status: Status.TODO, rgaSimulationData: null },
    } as never);
    vi.mocked(parcoursRepo.findById).mockResolvedValue({
      rgaSimulationData: null,
      rgaSimulationDataAgent: { logement: { commune: "36044", adresse: "1 rue des Argiles 36000 Châteauroux" } },
    } as never);
    vi.mocked(getDossierByStep).mockResolvedValue(null as never);
    vi.mocked(prefillClient.createPrefillDossier).mockResolvedValue({
      dossier_url: URL_DN,
      dossier_number: 42,
      dossier_id: "RG9zc2llci00Mg==",
    } as never);
    vi.mocked(createDossierForCurrentStep).mockResolvedValue({ success: true, data: { dossierId: "d1" } });
    mockEtat({ confie: false, gereParAmo: false });
  });

  it("laisse le demandeur créer son formulaire quand l'AMO n'est pas mandataire financier", async () => {
    const result = await createDiagnosticDossier("user-1");

    expect(result.success && result.data.cree).toBe(true);
    expect(createDossierForCurrentStep).toHaveBeenCalledWith(
      "user-1",
      "parcours-1",
      Step.DIAGNOSTIC,
      expect.objectContaining({ initiePar: INITIATEUR_FORMULAIRE.DEMANDEUR })
    );
  });

  it("refuse au demandeur la création quand l'AMO est mandataire financier", async () => {
    mockEtat({ confie: true, gereParAmo: true });

    const result = await createDiagnosticDossier("user-1");

    expect(result.success).toBe(false);
    expect(prefillClient.createPrefillDossier).not.toHaveBeenCalled();
  });

  // Sans cette garde, l'idempotence rendrait au demandeur le lien prefill du brouillon de l'AMO.
  it("ne rend pas au demandeur le lien d'un brouillon initié par l'AMO", async () => {
    mockEtat({ confie: true, gereParAmo: true, formulaire: brouillon("amo") });
    vi.mocked(getDossierByStep).mockResolvedValue({ id: "d0", dsUrl: URL_DN, dsNumber: "41" } as never);

    const result = await createDiagnosticDossier("user-1");

    expect(result.success).toBe(false);
  });

  it("crée le formulaire au nom de l'AMO mandataire financier", async () => {
    mockEtat({ confie: true, gereParAmo: true });

    const result = await createDiagnosticDossier("user-1", INITIATEUR_FORMULAIRE.AMO);

    expect(result.success && result.data.dossierUrl).toBe(URL_DN);
    expect(createDossierForCurrentStep).toHaveBeenCalledWith(
      "user-1",
      "parcours-1",
      Step.DIAGNOSTIC,
      expect.objectContaining({ initiePar: INITIATEUR_FORMULAIRE.AMO })
    );
  });

  it("refuse à une AMO non mandataire financier d'initier le formulaire", async () => {
    const result = await createDiagnosticDossier("user-1", INITIATEUR_FORMULAIRE.AMO);

    expect(result.success).toBe(false);
    expect(prefillClient.createPrefillDossier).not.toHaveBeenCalled();
  });

  it("refuse à l'AMO de reprendre le brouillon du demandeur : il doit d'abord être réinitialisé", async () => {
    mockEtat({ confie: true, gereParAmo: true, formulaire: brouillon("demandeur") });

    const result = await createDiagnosticDossier("user-1", INITIATEUR_FORMULAIRE.AMO);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("réinitialisez");
  });

  it("rend à l'AMO le lien de son brouillon sans en recréer", async () => {
    mockEtat({ confie: true, gereParAmo: true, formulaire: brouillon("amo") });
    vi.mocked(getDossierByStep).mockResolvedValue({ id: "d0", dsUrl: URL_DN, dsNumber: "41" } as never);

    const result = await createDiagnosticDossier("user-1", INITIATEUR_FORMULAIRE.AMO);

    expect(result).toMatchObject({ success: true, data: { cree: false, dossierUrl: URL_DN } });
    expect(prefillClient.createPrefillDossier).not.toHaveBeenCalled();
  });

  // Un dossier créé par un agent n'a pas de simulation demandeur : sans la commune, pas de routage DDT.
  it("préremplit la commune depuis la simulation de l'agent", async () => {
    await createDiagnosticDossier("user-1");

    const [payload] = vi.mocked(prefillClient.createPrefillDossier).mock.calls[0];
    expect(payload).toHaveProperty(`champ_${DS_FIELD_IDS.DIAGNOSTIC.COMMUNE}`);
    expect(payload).toHaveProperty(`champ_${DS_FIELD_IDS.DIAGNOSTIC.ADRESSE_MAISON_TEXTE}`);
  });
});
