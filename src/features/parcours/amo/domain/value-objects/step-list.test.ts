import { describe, it, expect } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { AmoMode } from "./departements-amo";
import { getStepBadgeLabel, getStepListItems } from "./step-list";

describe("getStepListItems", () => {
  describe("Mode OBLIGATOIRE / AV_AMO_FUSIONNES", () => {
    it("renvoie 5 items dont 'Attendre la réponse de votre AMO' actif sur CHOIX_AMO", () => {
      const items = getStepListItems(AmoMode.OBLIGATOIRE, null, Step.CHOIX_AMO, false);
      expect(items).toHaveLength(5);
      expect(items[0].label).toBe("Attendre la réponse de votre AMO");
      expect(items[0].state).toBe("active");
      expect(items[1].label).toContain("éligibilité");
      expect(items[1].state).toBe("pending");
    });

    it("AV_AMO_FUSIONNES se comporte comme OBLIGATOIRE", () => {
      const items = getStepListItems(AmoMode.AV_AMO_FUSIONNES, StatutValidationAmo.EN_ATTENTE, Step.CHOIX_AMO, false);
      expect(items).toHaveLength(5);
      expect(items[0].label).toBe("Attendre la réponse de votre AMO");
      expect(items[0].state).toBe("active");
    });

    it("marque l'item AMO completed si le parcours est sur ELIGIBILITE", () => {
      const items = getStepListItems(AmoMode.OBLIGATOIRE, StatutValidationAmo.LOGEMENT_ELIGIBLE, Step.ELIGIBILITE, false);
      expect(items[0].state).toBe("completed");
      expect(items[1].state).toBe("active"); // ELIGIBILITE active
    });
  });

  describe("Mode FACULTATIF — statut null (choix initial)", () => {
    it("renvoie 5 items dont 'Choix de l'accompagnement' actif", () => {
      const items = getStepListItems(AmoMode.FACULTATIF, null, Step.CHOIX_AMO, false);
      expect(items).toHaveLength(5);
      expect(items[0].label).toBe("Choix de l'accompagnement");
      expect(items[0].state).toBe("active");
      expect(items[1].state).toBe("pending");
    });
  });

  describe("Mode FACULTATIF — statut SANS_AMO", () => {
    it("renvoie 5 items, le 1er validé, et l'éligibilité active sur ELIGIBILITE/TODO", () => {
      const items = getStepListItems(AmoMode.FACULTATIF, StatutValidationAmo.SANS_AMO, Step.ELIGIBILITE, false);
      expect(items).toHaveLength(5);
      expect(items[0].label).toBe("Choix de l'accompagnement");
      expect(items[0].state).toBe("completed");
      expect(items[1].label).toContain("éligibilité");
      expect(items[1].state).toBe("active");
    });
  });

  describe("Mode FACULTATIF — AMO sélectionné (statut !== null && !== SANS_AMO)", () => {
    it("renvoie 6 items (choix validé + attente AMO active)", () => {
      const items = getStepListItems(AmoMode.FACULTATIF, StatutValidationAmo.EN_ATTENTE, Step.CHOIX_AMO, false);
      expect(items).toHaveLength(6);
      expect(items[0].label).toBe("Choix de l'accompagnement");
      expect(items[0].state).toBe("completed");
      expect(items[1].label).toBe("Attendre la réponse de votre AMO");
      expect(items[1].state).toBe("active");
      expect(items[2].state).toBe("pending");
    });

    it("statut LOGEMENT_ELIGIBLE + ELIGIBILITE → choix et attente completed, eligibilite active", () => {
      const items = getStepListItems(AmoMode.FACULTATIF, StatutValidationAmo.LOGEMENT_ELIGIBLE, Step.ELIGIBILITE, false);
      expect(items).toHaveLength(6);
      expect(items[0].state).toBe("completed");
      expect(items[1].state).toBe("completed");
      expect(items[2].state).toBe("active"); // ELIGIBILITE
    });
  });

  describe("État des étapes DS", () => {
    it("avant currentStep = completed, à currentStep = active sauf si DS accepté = completed, après = pending", () => {
      const items = getStepListItems(AmoMode.OBLIGATOIRE, StatutValidationAmo.LOGEMENT_ELIGIBLE, Step.DIAGNOSTIC, false);
      // [AMO, ELIGIBILITE, DIAGNOSTIC, DEVIS, FACTURES]
      expect(items[0].state).toBe("completed"); // AMO
      expect(items[1].state).toBe("completed"); // ELIGIBILITE (avant)
      expect(items[2].state).toBe("active"); // DIAGNOSTIC (courant)
      expect(items[3].state).toBe("pending"); // DEVIS (après)
    });

    it("DS accepté pour l'étape courante => completed", () => {
      const items = getStepListItems(AmoMode.OBLIGATOIRE, StatutValidationAmo.LOGEMENT_ELIGIBLE, Step.DIAGNOSTIC, true);
      expect(items[2].state).toBe("completed");
    });
  });
});

describe("getStepBadgeLabel", () => {
  it("renvoie '1. AMO' pour CHOIX_AMO (raccourci par rapport à STEP_LABELS_NUMBERED)", () => {
    expect(getStepBadgeLabel(Step.CHOIX_AMO)).toBe("1. AMO");
  });

  it("garde les labels existants pour les autres étapes", () => {
    expect(getStepBadgeLabel(Step.ELIGIBILITE)).toBe("2. Éligibilité");
    expect(getStepBadgeLabel(Step.DIAGNOSTIC)).toBe("3. Diagnostic");
    expect(getStepBadgeLabel(Step.DEVIS)).toBe("4. Devis");
    expect(getStepBadgeLabel(Step.FACTURES)).toBe("5. Factures");
  });

  it("renvoie chaîne vide si étape null", () => {
    expect(getStepBadgeLabel(null)).toBe("");
  });
});
