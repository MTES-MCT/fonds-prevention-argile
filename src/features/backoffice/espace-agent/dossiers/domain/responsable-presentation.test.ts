import { describe, it, expect } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  getDossierStepLabel,
  getEtatBadge,
  getDossierPrecisionLabel,
  getResponsableTabLabel,
} from "./responsable-presentation";

describe("getDossierStepLabel", () => {
  it("retourne 'Non-éligible' pour une validation LOGEMENT_NON_ELIGIBLE", () => {
    expect(getDossierStepLabel(Step.CHOIX_AMO, { statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE })).toBe(
      "Non-éligible"
    );
  });

  it("retourne le libellé maquette pour CHOIX_AMO", () => {
    expect(getDossierStepLabel(Step.CHOIX_AMO, null)).toBe("Choix de l'AMO");
  });

  it("retourne 'Création de compte' pour INVITATION", () => {
    expect(getDossierStepLabel(Step.INVITATION, null)).toBe("Création de compte");
  });
});

describe("getEtatBadge", () => {
  it("formate AV_QUALIFICATION avec son département", () => {
    const badge = getEtatBadge("AV_QUALIFICATION", "36");
    expect(badge.label).toBe("AV 36");
    expect(badge.colorClass).toContain("warning");
  });

  it("formate EN_ATTENTE_AMO avec son département", () => {
    const badge = getEtatBadge("EN_ATTENTE_AMO", "91");
    expect(badge.label).toBe("AMO 91");
  });

  it("formate AV_QUALIFICATION sans département (label court)", () => {
    expect(getEtatBadge("AV_QUALIFICATION", null).label).toBe("AV");
  });

  it("retourne 'Ménage' pour MENAGE", () => {
    expect(getEtatBadge("MENAGE", "36").label).toBe("Ménage");
  });

  it("retourne 'Instruction DDT' pour DDT", () => {
    expect(getEtatBadge("DDT", null).label).toBe("Instruction DDT");
  });

  it("retourne 'Archivé' pour ARCHIVE", () => {
    expect(getEtatBadge("ARCHIVE", null).label).toBe("Archivé");
  });

  it("retourne 'Refusé' pour REFUSE", () => {
    expect(getEtatBadge("REFUSE", null).label).toBe("Refusé");
  });
});

describe("getDossierPrecisionLabel", () => {
  it("renvoie un texte refus pour une validation LOGEMENT_NON_ELIGIBLE", () => {
    const text = getDossierPrecisionLabel(
      "REFUSE",
      Step.ELIGIBILITE,
      Status.TODO,
      null,
      { statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE },
      null
    );
    expect(text).toBe("Logement non éligible.");
  });

  it("renvoie un texte refus pour une validation ACCOMPAGNEMENT_REFUSE", () => {
    const text = getDossierPrecisionLabel(
      "REFUSE",
      Step.ELIGIBILITE,
      Status.TODO,
      null,
      { statut: StatutValidationAmo.ACCOMPAGNEMENT_REFUSE },
      null
    );
    expect(text).toBe("Accompagnement refusé.");
  });

  it("renvoie 'En instruction' pour un état DDT", () => {
    const text = getDossierPrecisionLabel(
      "DDT",
      Step.ELIGIBILITE,
      Status.EN_INSTRUCTION,
      null,
      { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      null
    );
    expect(text).toMatch(/En instruction/);
  });

  it("renvoie le label TODO ménage pour une étape DIAGNOSTIC TODO", () => {
    const text = getDossierPrecisionLabel(
      "MENAGE",
      Step.DIAGNOSTIC,
      Status.TODO,
      null,
      { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      null
    );
    expect(text).toMatch(/diagnostic/i);
  });

  it("renvoie 'remplir' (premier dépôt) quand EN_CONSTRUCTION sans instructedAt", () => {
    const text = getDossierPrecisionLabel(
      "MENAGE",
      Step.ELIGIBILITE,
      Status.TODO,
      DSStatus.EN_CONSTRUCTION,
      { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      null
    );
    expect(text).toBe("Le demandeur doit remplir le formulaire d'éligibilité.");
  });

  it("renvoie 'corriger' pour un dossier d'éligibilité renvoyé en construction par la DDT", () => {
    const text = getDossierPrecisionLabel(
      "MENAGE",
      Step.ELIGIBILITE,
      Status.TODO,
      DSStatus.EN_CONSTRUCTION,
      { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      new Date("2026-01-10T10:00:00Z")
    );
    expect(text).toBe("Le demandeur doit corriger son formulaire d'éligibilité.");
  });

  it("renvoie 'corriger' pour un dossier de diagnostic renvoyé en construction par la DDT", () => {
    const text = getDossierPrecisionLabel(
      "MENAGE",
      Step.DIAGNOSTIC,
      Status.TODO,
      DSStatus.EN_CONSTRUCTION,
      { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE },
      new Date("2026-01-10T10:00:00Z")
    );
    expect(text).toBe("Le demandeur doit corriger son diagnostic.");
  });

  it("renvoie 'En attente de qualification' pour AV_QUALIFICATION", () => {
    const text = getDossierPrecisionLabel("AV_QUALIFICATION", Step.INVITATION, Status.TODO, null, null, null);
    expect(text).toMatch(/qualification/i);
  });

  it("renvoie 'Dossier archivé' pour ARCHIVE", () => {
    const text = getDossierPrecisionLabel("ARCHIVE", Step.ELIGIBILITE, Status.TODO, null, null, null);
    expect(text).toBe("Dossier archivé.");
  });
});

describe("getResponsableTabLabel", () => {
  it("retourne le prefix seul sans département", () => {
    expect(getResponsableTabLabel("AV", [])).toBe("AV");
  });

  it("suffixe avec le code département s'il y en a un seul", () => {
    expect(getResponsableTabLabel("AMO", ["36"])).toBe("AMO 36");
  });

  it("indique le nombre de départements pour plusieurs", () => {
    expect(getResponsableTabLabel("AV", ["36", "91", "75"])).toBe("AV (3)");
  });
});
