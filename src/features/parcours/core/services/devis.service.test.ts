import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDevisDossier } from "./devis.service";
import { getParcoursComplet } from "./parcours-state.service";
import { prefillClient } from "../../dossiers-ds/adapters";
import { createDossierForCurrentStep, getDossierByStep } from "../../dossiers-ds/services";
import { parcoursRepo } from "@/shared/database";
import { Status } from "../domain/value-objects/status";
import { Step } from "../domain/value-objects/step";
import { DS_FIELD_IDS } from "../../dossiers-ds/domain/value-objects/ds-field-ids";

vi.mock("./parcours-state.service", () => ({
  getParcoursComplet: vi.fn(),
}));

vi.mock("../../dossiers-ds/adapters", () => ({
  prefillClient: {
    createPrefillDossier: vi.fn(),
    getDemarcheId: vi.fn(() => "150268"),
  },
}));

vi.mock("../../dossiers-ds/services", () => ({
  createDossierForCurrentStep: vi.fn(),
  getDossierByStep: vi.fn(),
}));

vi.mock("@/shared/database", () => ({
  parcoursRepo: {
    updateStatus: vi.fn(),
  },
}));

vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({ BASE_URL: "https://app.test" })),
}));

const mockParcours = (overrides: Record<string, unknown> = {}) => ({
  parcours: {
    id: "parcours-1",
    currentStep: Step.DEVIS,
    status: Status.TODO,
    rgaSimulationData: {
      logement: { commune: "75001", adresse: "12 rue des Lilas 75001 Paris" },
    },
    ...overrides,
  },
});

describe("createDevisDossier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse si l'étape courante n'est pas DEVIS", async () => {
    vi.mocked(getParcoursComplet).mockResolvedValue(mockParcours({ currentStep: Step.DIAGNOSTIC }) as never);

    const result = await createDevisDossier("user-1");

    expect(result.success).toBe(false);
    expect(vi.mocked(prefillClient.createPrefillDossier)).not.toHaveBeenCalled();
  });

  it("est idempotent : retourne le dossier existant sans en recréer", async () => {
    vi.mocked(getParcoursComplet).mockResolvedValue(mockParcours() as never);
    vi.mocked(getDossierByStep).mockResolvedValueOnce({
      id: "dossier-existant",
      dsUrl: "https://ds.test/dossiers/42",
      dsNumber: "42",
    } as never);

    const result = await createDevisDossier("user-1");

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.dossierUrl).toBe("https://ds.test/dossiers/42");
    expect(vi.mocked(prefillClient.createPrefillDossier)).not.toHaveBeenCalled();
  });

  it("préremplit les 3 annotations + adresse/commune et crée le dossier", async () => {
    vi.mocked(getParcoursComplet).mockResolvedValue(mockParcours() as never);
    // 1er appel = dossier DEVIS (aucun), 2e = ELIGIBILITE, 3e = DIAGNOSTIC
    vi.mocked(getDossierByStep)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce({ dsNumber: "100" } as never)
      .mockResolvedValueOnce({ dsNumber: "200" } as never);
    vi.mocked(prefillClient.createPrefillDossier).mockResolvedValue({
      dossier_url: "https://ds.test/dossiers/300",
      dossier_number: 300,
      dossier_id: "gql-300",
    } as never);
    vi.mocked(createDossierForCurrentStep).mockResolvedValue({
      success: true,
      data: { dossierId: "db-300" },
    } as never);

    const result = await createDevisDossier("user-1");

    expect(result.success).toBe(true);
    const payload = vi.mocked(prefillClient.createPrefillDossier).mock.calls[0][0];
    expect(payload[`champ_${DS_FIELD_IDS.DEVIS.ANNOTATION_DOSSIER_ELIGIBILITE}`]).toBe("100");
    expect(payload[`champ_${DS_FIELD_IDS.DEVIS.ANNOTATION_DOSSIER_PAIEMENT_ETUDE}`]).toBe("200");
    expect(payload[`champ_${DS_FIELD_IDS.DEVIS.ANNOTATION_LIEN_FPA}`]).toBe(
      "https://app.test/espace-agent/dossiers/parcours-1"
    );
    expect(payload[`champ_${DS_FIELD_IDS.DEVIS.COMMUNE}`]).toEqual(["75001", "75001"]);
    expect(payload[`champ_${DS_FIELD_IDS.DEVIS.ADRESSE_MAISON_TEXTE}`]).toBe("12 rue des Lilas");
    // La création DS est bien scopée à l'étape DEVIS
    expect(vi.mocked(prefillClient.createPrefillDossier).mock.calls[0][1]).toBe(Step.DEVIS);
    expect(vi.mocked(parcoursRepo.updateStatus)).toHaveBeenCalledWith("parcours-1", Status.TODO);
  });
});
