import { describe, it, expect } from "vitest";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
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

  it("AV_QUALIFICATION pour SANS_AMO (renonciation explicite)", () => {
    expect(
      getDossierEtat({
        currentStatus: Status.TODO,
        archivedAt: null,
        validation: { statut: StatutValidationAmo.SANS_AMO },
      })
    ).toBe("AV_QUALIFICATION");
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
});
