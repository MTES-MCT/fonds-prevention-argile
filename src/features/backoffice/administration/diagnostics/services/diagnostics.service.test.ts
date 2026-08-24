import { describe, it, expect, vi } from "vitest";
import { classify } from "./diagnostics.service";
import { DiagnosticState, DIAGNOSTIC_STATE_META } from "../domain/diagnostics.types";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

vi.mock("@/shared/database/client", () => ({ db: {} }));

/** Ligne minimale : un dossier d'éligibilité rattaché à un parcours actif. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    parcoursId: "p1",
    userId: "u1",
    currentStep: Step.ELIGIBILITE,
    currentStatus: Status.TODO,
    parcoursCreatedAt: new Date("2026-06-01T00:00:00Z"),
    dossierId: "d1",
    dsNumber: "123",
    dsStatus: null,
    submittedAt: null,
    instructedAt: null,
    lastSyncAt: null,
    dossierCreatedAt: new Date("2026-06-02T00:00:00Z"),
    dnProbeState: null,
    dnProbeAt: null,
    eligAccepteId: null,
    userNom: null,
    userPrenom: null,
    userEmail: null,
    ...overrides,
  } as never;
}

// Cf. ADR-0026 : DN masque un prérempli non transmis à l'API instructeur.
describe("classify — prérempli non déposé (ADR-0026)", () => {
  it("classe en « prérempli non déposé » un dossier jamais observé, même sans erreur de sync", () => {
    expect(classify(row({ dnProbeState: "not_found" }), undefined)).toBe(DiagnosticState.DOSSIER_DN_NON_CREE);
  });

  it("ne le classe pas en « jamais synchronisé » (qui reste réservé au faux dépôt legacy)", () => {
    expect(classify(row(), undefined)).not.toBe(DiagnosticState.JAMAIS_SYNCHRONISE);
    // submitted_at posé à la création sans sync (pré-#216) : là, l'anomalie tient toujours.
    expect(classify(row({ submittedAt: new Date("2026-06-02T00:00:00Z") }), undefined)).toBe(
      DiagnosticState.JAMAIS_SYNCHRONISE
    );
  });

  it("reste un état informatif, jamais une anomalie", () => {
    expect(DIAGNOSTIC_STATE_META[DiagnosticState.DOSSIER_DN_NON_CREE].severity).toBe("info");
  });

  it("conserve l'anomalie technique quand le verdict DN est unauthorized/api_error", () => {
    expect(classify(row({ dnProbeState: "unauthorized" }), "boom")).toBe(DiagnosticState.SYNC_ANOMALIE);
    expect(classify(row({ dnProbeState: "api_error" }), "boom")).toBe(DiagnosticState.SYNC_ANOMALIE);
  });

  it("conserve « dossier déposé disparu » pour un dépôt confirmé par une sync", () => {
    const r = row({
      dnProbeState: "not_found",
      lastSyncAt: new Date("2026-07-01T00:00:00Z"),
      submittedAt: new Date("2026-07-01T00:00:00Z"),
    });
    expect(classify(r, "boom")).toBe(DiagnosticState.DOSSIER_DEPOSE_DISPARU);
  });

  it("laisse intacts les états normaux d'un dossier réellement synchronisé", () => {
    const r = row({
      dsStatus: DSStatus.EN_INSTRUCTION,
      lastSyncAt: new Date("2026-07-01T00:00:00Z"),
      submittedAt: new Date("2026-06-20T00:00:00Z"),
      instructedAt: new Date("2026-06-25T00:00:00Z"),
    });
    expect(classify(r, undefined)).toBe(DiagnosticState.EN_INSTRUCTION);
  });
});
