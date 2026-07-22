import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncDossierStatus } from "./ds-sync.service";
import { getDossierByStep, updateDossierStatus, recordDnProbeState } from "./dossier-ds.service";
import { graphqlClient } from "../adapters/graphql/client";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { emitBrevoEvent, BREVO_EVENTS, BREVO_ATTRS } from "@/shared/email/brevo";

vi.mock("./dossier-ds.service", () => ({
  getDossierByStep: vi.fn(),
  updateDossierStatus: vi.fn(),
  recordDnProbeState: vi.fn(),
}));

vi.mock("../adapters/graphql/client", () => ({
  graphqlClient: {
    getDossierStatus: vi.fn(),
  },
}));

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
