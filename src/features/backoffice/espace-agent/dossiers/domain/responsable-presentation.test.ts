import { describe, it, expect } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import {
  getDossierStepLabel,
  getResponsableBadge,
  getDossierPrecisionLabel,
} from "./responsable-presentation";

describe("getDossierStepLabel", () => {
  it("retourne 'Non-éligible' pour une validation LOGEMENT_NON_ELIGIBLE", () => {
    expect(
      getDossierStepLabel(Step.CHOIX_AMO, { statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE })
    ).toBe("Non-éligible");
  });

  it("retourne le libellé maquette pour CHOIX_AMO", () => {
    expect(getDossierStepLabel(Step.CHOIX_AMO, null)).toBe("Choix de l'AMO");
  });

  it("retourne 'Pré-éligibilité' pour INVITATION", () => {
    expect(getDossierStepLabel(Step.INVITATION, null)).toBe("Pré-éligibilité");
  });
});

describe("getResponsableBadge", () => {
  it("formate AV avec son département", () => {
    const badge = getResponsableBadge({
      type: "AV",
      structureId: "av-1",
      structureNom: "ADIL 36",
      codeDepartement: "36",
    });
    expect(badge.label).toBe("AV 36");
    expect(badge.colorClass).toContain("warning");
  });

  it("formate AMO avec son département", () => {
    const badge = getResponsableBadge({
      type: "AMO",
      entrepriseId: "amo-1",
      entrepriseNom: "Entreprise A",
      codeDepartement: "91",
    });
    expect(badge.label).toBe("AMO 91");
  });

  it("retourne 'Archivé' pour ARCHIVE", () => {
    expect(getResponsableBadge({ type: "ARCHIVE" }).label).toBe("Archivé");
  });
});

describe("getDossierPrecisionLabel", () => {
  it("renvoie un texte refus pour une validation LOGEMENT_NON_ELIGIBLE", () => {
    const text = getDossierPrecisionLabel(
      { type: "ARCHIVE" },
      Step.ELIGIBILITE,
      Status.TODO,
      null,
      { statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE }
    );
    expect(text).toBe("Logement non éligible.");
  });

  it("renvoie 'En instruction' pour un responsable DDT", () => {
    const text = getDossierPrecisionLabel(
      { type: "DDT", codeDepartement: "36" },
      Step.ELIGIBILITE,
      Status.EN_INSTRUCTION,
      null,
      { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE }
    );
    expect(text).toMatch(/En instruction/);
  });

  it("renvoie le label TODO ménage pour une étape DIAGNOSTIC TODO", () => {
    const text = getDossierPrecisionLabel(
      { type: "MENAGE", codeDepartement: "36" },
      Step.DIAGNOSTIC,
      Status.TODO,
      null,
      { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE }
    );
    expect(text).toMatch(/diagnostic/i);
  });
});
