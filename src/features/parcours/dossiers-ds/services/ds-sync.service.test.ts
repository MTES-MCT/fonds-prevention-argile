import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncDossierStatus } from "./ds-sync.service";
import { getDossierByStep, updateDossierStatus, recordDnProbeState } from "./dossier-ds.service";
import { graphqlClient, DsGraphQLError } from "../adapters/graphql/client";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { emitBrevoEvent, BREVO_EVENTS, BREVO_ATTRS } from "@/shared/email/brevo";

vi.mock("./dossier-ds.service", () => ({
  getDossierByStep: vi.fn(),
  updateDossierStatus: vi.fn(),
  recordDnProbeState: vi.fn(),
}));

vi.mock("../adapters/graphql/client", () => {
  class DsGraphQLError extends Error {
    readonly code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.name = "DsGraphQLError";
      this.code = code;
    }
  }
  return { graphqlClient: { getDossierStatus: vi.fn() }, DsGraphQLError };
});

// La barrière @/shared/email/brevo réimportée via importOriginal ci-dessous tire tout son
// graphe de dépendances réel (contact-mapping -> admin-url-resolver, conseiller-mapping ->
// responsable-resolver -> repositories), qui touche le client DB réel au chargement du
// module quelle que soit la façon dont il est importé plus bas dans le graphe — mocker le
// fichier racine suffit (même pattern que amo-selection/amo-auto/amo-validation.service.test.ts).
vi.mock("@/shared/database/client", () => ({ db: {} }));

vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
}));

const mockedGetDossierByStep = vi.mocked(getDossierByStep);
const mockedUpdateDossierStatus = vi.mocked(updateDossierStatus);
const mockedRecordDnProbeState = vi.mocked(recordDnProbeState);
const mockedGetDossierStatus = vi.mocked(graphqlClient.getDossierStatus);
const mockedEmit = vi.mocked(emitBrevoEvent);

describe("syncDossierStatus — propagation de la date de décision (dateTraitement)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateDossierStatus.mockResolvedValue({ success: true, data: { updated: true } });
    mockedRecordDnProbeState.mockResolvedValue(undefined);
  });

  it("écrit processedAt depuis dateTraitement lors du passage à REFUSE", async () => {
    mockedGetDossierByStep.mockResolvedValue({
      id: "d1",
      dsStatus: DSStatus.EN_INSTRUCTION,
    } as never);
    mockedGetDossierStatus.mockResolvedValue({
      state: DSStatus.REFUSE,
      datePassageEnConstruction: "2026-06-10T00:00:00Z",
      datePassageEnInstruction: "2026-06-12T00:00:00Z",
      dateTraitement: "2026-06-20T00:00:00Z",
    });

    const result = await syncDossierStatus("p1", Step.ELIGIBILITE, "123");

    expect(result.success).toBe(true);
    expect(mockedUpdateDossierStatus).toHaveBeenCalledWith(
      "d1",
      DSStatus.REFUSE,
      expect.objectContaining({ processedAt: new Date("2026-06-20T00:00:00Z") })
    );
  });

  it("écrit processedAt depuis dateTraitement lors du passage à ACCEPTE", async () => {
    mockedGetDossierByStep.mockResolvedValue({
      id: "d2",
      dsStatus: DSStatus.EN_INSTRUCTION,
    } as never);
    mockedGetDossierStatus.mockResolvedValue({
      state: DSStatus.ACCEPTE,
      datePassageEnConstruction: "2026-06-10T00:00:00Z",
      datePassageEnInstruction: "2026-06-12T00:00:00Z",
      dateTraitement: "2026-06-21T00:00:00Z",
    });

    await syncDossierStatus("p1", Step.ELIGIBILITE, "456");

    expect(mockedUpdateDossierStatus).toHaveBeenCalledWith(
      "d2",
      DSStatus.ACCEPTE,
      expect.objectContaining({ processedAt: new Date("2026-06-21T00:00:00Z") })
    );
  });

  it("ne renseigne pas processedAt tant que la décision n'est pas prise (pas de dateTraitement)", async () => {
    mockedGetDossierByStep.mockResolvedValue({
      id: "d3",
      dsStatus: DSStatus.EN_CONSTRUCTION,
    } as never);
    mockedGetDossierStatus.mockResolvedValue({
      state: DSStatus.EN_INSTRUCTION,
      datePassageEnConstruction: "2026-06-10T00:00:00Z",
      datePassageEnInstruction: "2026-06-12T00:00:00Z",
    });

    await syncDossierStatus("p1", Step.ELIGIBILITE, "789");

    expect(mockedUpdateDossierStatus).toHaveBeenCalledWith(
      "d3",
      DSStatus.EN_INSTRUCTION,
      expect.objectContaining({ processedAt: undefined })
    );
  });
});

describe("syncDossierStatus — évènement Brevo dn_update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateDossierStatus.mockResolvedValue({ success: true, data: { updated: true } });
    mockedRecordDnProbeState.mockResolvedValue(undefined);
  });

  it("émet dn_update sur changement de ds_status (DS_STATUT + transition)", async () => {
    mockedGetDossierByStep.mockResolvedValue({ id: "d1", dsStatus: DSStatus.EN_INSTRUCTION } as never);
    mockedGetDossierStatus.mockResolvedValue({ state: DSStatus.ACCEPTE, dateTraitement: "2026-06-21T00:00:00Z" });

    await syncDossierStatus("p1", Step.ELIGIBILITE, "456");

    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.DN_UPDATE, {
      attributes: { [BREVO_ATTRS.DS_STATUT]: DSStatus.ACCEPTE },
      eventProperties: {
        step: Step.ELIGIBILITE,
        old_ds_status: DSStatus.EN_INSTRUCTION,
        new_ds_status: DSStatus.ACCEPTE,
      },
    });
  });

  it("n'émet pas dn_update quand le ds_status est inchangé", async () => {
    mockedGetDossierByStep.mockResolvedValue({ id: "d1", dsStatus: DSStatus.EN_INSTRUCTION } as never);
    mockedGetDossierStatus.mockResolvedValue({ state: DSStatus.EN_INSTRUCTION });

    await syncDossierStatus("p1", Step.ELIGIBILITE, "456");

    expect(mockedEmit).not.toHaveBeenCalled();
  });
});

// Cf. ADR-0026 : DN masque un prérempli non transmis à l'API instructeur, qui répond
// « not found » comme pour un dossier purgé. Un tel dossier ne doit plus être compté en erreur.
describe("syncDossierStatus — prérempli non déposé (ADR-0026)", () => {
  const prefillNonObserve = { id: "d1", dsStatus: null, lastSyncAt: null, submittedAt: null };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateDossierStatus.mockResolvedValue({ success: true, data: { updated: true } });
    mockedRecordDnProbeState.mockResolvedValue(undefined);
  });

  it("ne signale pas d'erreur quand DN répond not_found sur un dossier jamais observé", async () => {
    mockedGetDossierByStep.mockResolvedValue(prefillNonObserve as never);
    mockedGetDossierStatus.mockRejectedValue(new DsGraphQLError("GraphQL errors: Dossier not found", "not_found"));

    const result = await syncDossierStatus("p1", Step.ELIGIBILITE, "123");

    if (!result.success) throw new Error(`attendu en succès, reçu : ${result.error}`);
    expect(result.data.notObserved).toBe(true);
    expect(mockedRecordDnProbeState).toHaveBeenCalledWith("d1", "not_found");
  });

  it("traite le null de DN comme un prérempli non déposé, pas comme une disparition", async () => {
    mockedGetDossierByStep.mockResolvedValue(prefillNonObserve as never);
    mockedGetDossierStatus.mockResolvedValue(null);

    const result = await syncDossierStatus("p1", Step.ELIGIBILITE, "123");

    if (!result.success) throw new Error(`attendu en succès, reçu : ${result.error}`);
    expect(result.data.notObserved).toBe(true);
  });

  it("signale bien une erreur quand un dossier DÉJÀ observé disparaît", async () => {
    mockedGetDossierByStep.mockResolvedValue({
      id: "d2",
      dsStatus: DSStatus.EN_CONSTRUCTION,
      lastSyncAt: new Date("2026-07-01T00:00:00Z"),
      submittedAt: new Date("2026-07-01T00:00:00Z"),
    } as never);
    mockedGetDossierStatus.mockRejectedValue(new DsGraphQLError("GraphQL errors: Dossier not found", "not_found"));

    const result = await syncDossierStatus("p1", Step.ELIGIBILITE, "456");

    if (result.success) throw new Error("attendu en échec : un dossier déjà observé qui disparaît");
    expect(result.error).toContain("456");
  });

  it("classe sur extensions.code, sans dépendre du libellé du message", async () => {
    mockedGetDossierByStep.mockResolvedValue(prefillNonObserve as never);
    mockedGetDossierStatus.mockRejectedValue(new DsGraphQLError("GraphQL errors: accès refusé", "unauthorized"));

    const result = await syncDossierStatus("p1", Step.ELIGIBILITE, "789");

    expect(mockedRecordDnProbeState).toHaveBeenCalledWith("d1", "unauthorized");
    expect(result.success).toBe(false);
  });
});
