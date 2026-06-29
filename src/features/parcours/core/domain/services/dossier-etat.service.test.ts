import { describe, it, expect } from "vitest";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { getDossierEtat } from "./dossier-etat.service";

describe("getDossierEtat", () => {
  it("ARCHIVE si parcours archivé", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: new Date(),
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      })
    ).toBe("ARCHIVE");
  });

  it("REFUSE pour LOGEMENT_NON_ELIGIBLE", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE },
      })
    ).toBe("REFUSE");
  });

  it("REFUSE pour ACCOMPAGNEMENT_REFUSE", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.ACCOMPAGNEMENT_REFUSE },
      })
    ).toBe("REFUSE");
  });

  it("AV_QUALIFICATION quand pas de validation (pré-éligibilité)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: null,
      })
    ).toBe("AV_QUALIFICATION");
  });

  it("MENAGE pour SANS_AMO + étape TODO côté demandeur (progresse, pas d'attente AV)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.SANS_AMO },
      })
    ).toBe("MENAGE");
  });

  it("DDT pour SANS_AMO + dossier déposé en attente d'instruction (EN_CONSTRUCTION, jamais instruit)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.SANS_AMO },
        dsStatus: DSStatus.EN_CONSTRUCTION,
        instructedAt: null,
      })
    ).toBe("DDT");
  });

  it("DDT pour SANS_AMO + dossier en instruction (EN_INSTRUCTION)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.SANS_AMO },
        dsStatus: DSStatus.EN_INSTRUCTION,
        instructedAt: new Date("2026-01-12T10:00:00Z"),
      })
    ).toBe("DDT");
  });

  it("MENAGE pour SANS_AMO + dossier renvoyé pour correction (EN_CONSTRUCTION, déjà instruit)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.SANS_AMO },
        dsStatus: DSStatus.EN_CONSTRUCTION,
        instructedAt: new Date("2026-01-10T10:00:00Z"),
      })
    ).toBe("MENAGE");
  });

  it("EN_ATTENTE_AMO pour une validation EN_ATTENTE", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.EN_ATTENTE },
      })
    ).toBe("EN_ATTENTE_AMO");
  });

  it("DDT pour une validation acceptée + étape en instruction", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.EN_INSTRUCTION,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      })
    ).toBe("DDT");
  });

  it("MENAGE pour une validation acceptée + étape TODO côté demandeur", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      })
    ).toBe("MENAGE");
  });

  it("MENAGE pour une validation acceptée + étape VALIDE (passage à l'étape suivante)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.VALIDE,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      })
    ).toBe("MENAGE");
  });

  it("MENAGE pour une validation acceptée + dossier pas encore déposé (ds_status null)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
        dsStatus: null,
        instructedAt: null,
      })
    ).toBe("MENAGE");
  });

  it("DDT pour un dossier déposé en attente de prise en instruction (EN_CONSTRUCTION, jamais instruit)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
        dsStatus: DSStatus.EN_CONSTRUCTION,
        instructedAt: null,
      })
    ).toBe("DDT");
  });

  it("MENAGE pour un dossier renvoyé en construction pour correction (EN_CONSTRUCTION, déjà instruit)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
        dsStatus: DSStatus.EN_CONSTRUCTION,
        instructedAt: new Date("2026-01-10T10:00:00Z"),
      })
    ).toBe("MENAGE");
  });

  it("DDT pour un dossier en instruction (EN_INSTRUCTION) même si current_status TODO", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
        dsStatus: DSStatus.EN_INSTRUCTION,
        instructedAt: new Date("2026-01-12T10:00:00Z"),
      })
    ).toBe("DDT");
  });
});
