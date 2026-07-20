import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEligibiliteDossier } from "./eligibilite.service";
import { getParcoursComplet } from "./parcours-state.service";
import { getAmoChoisie, getValidationAmo } from "../../amo/actions";
import { mapRGAToDSFormat } from "../../dossiers-ds/mappers/rga-to-ds.mapper";
import { prefillClient } from "../../dossiers-ds/adapters";
import { createDossierForCurrentStep, getDossierByStep } from "../../dossiers-ds/services";
import { userRepo } from "@/shared/database";
import { Status } from "../domain/value-objects/status";
import { Step } from "../domain/value-objects/step";
import { DS_FIELD_IDS, DS_OPTIONS_MANDATAIRE } from "../../dossiers-ds/domain/value-objects/ds-field-ids";

vi.mock("./parcours-state.service", () => ({
  getParcoursComplet: vi.fn(),
}));

vi.mock("../../amo/actions", () => ({
  getAmoChoisie: vi.fn(),
  getValidationAmo: vi.fn(),
}));

vi.mock("../../dossiers-ds/mappers/rga-to-ds.mapper", () => ({
  mapRGAToDSFormat: vi.fn(),
  validateRGADataForDS: vi.fn(() => ({ isValid: true, errors: [], warnings: [] })),
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
  parcoursRepo: { updateStatus: vi.fn() },
  userRepo: { findById: vi.fn() },
}));

const AMO = {
  nom: "AMO Test",
  siret: "12345678900011",
  adresse: "1 rue de l'AMO 75002 Paris",
  emails: "contact@amo.fr;autre@amo.fr",
  telephone: "0102030405",
};

async function runWithAmo(amoOverrides: Partial<typeof AMO> | null, estMandataireFinancier: boolean | null = null) {
  vi.mocked(getValidationAmo).mockResolvedValue({
    success: true,
    data: { estMandataireFinancier },
  } as never);
  vi.mocked(getParcoursComplet).mockResolvedValue({
    parcours: { id: "parcours-1", currentStep: Step.ELIGIBILITE, status: Status.TODO },
  } as never);
  vi.mocked(getDossierByStep).mockResolvedValue(null as never);
  vi.mocked(getAmoChoisie).mockResolvedValue({
    success: true,
    data: amoOverrides === null ? null : { ...AMO, ...amoOverrides },
  } as never);
  vi.mocked(mapRGAToDSFormat).mockReturnValue({});
  vi.mocked(userRepo.findById).mockResolvedValue(null as never);
  vi.mocked(prefillClient.createPrefillDossier).mockResolvedValue({
    dossier_url: "https://ds.test/dossiers/1",
    dossier_number: 1,
    dossier_id: "gql-1",
  } as never);
  vi.mocked(createDossierForCurrentStep).mockResolvedValue({
    success: true,
    data: { dossierId: "db-1" },
  } as never);

  const result = await createEligibiliteDossier("user-1", {} as never);
  expect(result.success).toBe(true);
  return vi.mocked(prefillClient.createPrefillDossier).mock.calls[0][0];
}

describe("createEligibiliteDossier — prefill AMO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mappe l'AMO sur les vrais IDs de champs DN (siret, email, adresse, téléphone)", async () => {
    const payload = await runWithAmo({});

    expect(payload[`champ_${DS_FIELD_IDS.ELIGIBILITE.SIRET_AMO}`]).toBe(AMO.siret);
    // Premier email uniquement (la liste est séparée par ";")
    expect(payload[`champ_${DS_FIELD_IDS.ELIGIBILITE.EMAIL_AMO}`]).toBe("contact@amo.fr");
    expect(payload[`champ_${DS_FIELD_IDS.ELIGIBILITE.ADRESSE_AMO}`]).toBe(AMO.adresse);
    expect(payload[`champ_${DS_FIELD_IDS.ELIGIBILITE.TELEPHONE_AMO}`]).toBe(AMO.telephone);
  });

  it("n'utilise plus de clés inventées et n'écrit l'adresse qu'une seule fois", async () => {
    const payload = await runWithAmo({});

    expect(payload).not.toHaveProperty("champ_amo_email");
    expect(payload).not.toHaveProperty("champ_amo_telephone");
    expect(payload).not.toHaveProperty("champ_amo_adresse");
    // Une seule clé porte l'adresse de l'AMO
    const adresseKeys = Object.entries(payload).filter(([, v]) => v === AMO.adresse);
    expect(adresseKeys).toHaveLength(1);
  });

  it("omet téléphone et adresse quand ils sont absents", async () => {
    const payload = await runWithAmo({ telephone: "", adresse: "" });

    expect(payload[`champ_${DS_FIELD_IDS.ELIGIBILITE.EMAIL_AMO}`]).toBe("contact@amo.fr");
    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.TELEPHONE_AMO}`);
    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.ADRESSE_AMO}`);
  });

  it("n'ajoute aucun champ AMO en mode « je gère seul » (pas d'AMO)", async () => {
    const payload = await runWithAmo(null);

    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.SIRET_AMO}`);
    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.EMAIL_AMO}`);
    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.ADRESSE_AMO}`);
    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.TELEPHONE_AMO}`);
  });

  it("préremplit « Mandataire financier » quand l'AMO s'est déclarée mandataire", async () => {
    const payload = await runWithAmo({}, true);

    expect(payload[`champ_${DS_FIELD_IDS.ELIGIBILITE.MANDATAIRE_FINANCIER}`]).toBe(DS_OPTIONS_MANDATAIRE.FINANCIER);
  });

  it("laisse le champ mandataire vide quand l'AMO a répondu « non »", async () => {
    // Un « non » ne dit pas s'il existe un autre mandataire : on ne répond pas à sa place.
    const payload = await runWithAmo({}, false);

    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.MANDATAIRE_FINANCIER}`);
  });

  it("laisse le champ mandataire vide quand la question n'a pas été posée (null)", async () => {
    const payload = await runWithAmo({}, null);

    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.MANDATAIRE_FINANCIER}`);
  });

  it("n'écrit pas le champ mandataire sans AMO, même si la validation le dit mandataire", async () => {
    const payload = await runWithAmo(null, true);

    expect(payload).not.toHaveProperty(`champ_${DS_FIELD_IDS.ELIGIBILITE.MANDATAIRE_FINANCIER}`);
  });
});
