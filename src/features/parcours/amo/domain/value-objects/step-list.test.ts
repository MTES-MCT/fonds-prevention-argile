import { describe, it, expect } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { AmoMode } from "./departements-amo";
import { getStepBadgeLabel, getStepListItems } from "./step-list";

describe("getStepListItems", () => {
  describe("Mode OBLIGATOIRE / AV_AMO_FUSIONNES", () => {
    it("renvoie 5 items dont 'Attendre la réponse de votre AMO' actif sur CHOIX_AMO", () => {
      const items = getStepListItems(AmoMode.OBLIGATOIRE, null, Step.CHOIX_AMO, false, null);
      expect(items).toHaveLength(5);
      expect(items[0].label).toBe("Attendre la réponse de votre AMO");
      expect(items[0].state).toBe("active");
      expect(items[1].label).toContain("éligibilité");
      expect(items[1].state).toBe("pending");
    });

    it("AV_AMO_FUSIONNES se comporte comme OBLIGATOIRE", () => {
      const items = getStepListItems(
        AmoMode.AV_AMO_FUSIONNES,
        StatutValidationAmo.EN_ATTENTE,
        Step.CHOIX_AMO,
        false,
        null
      );
      expect(items).toHaveLength(5);
      expect(items[0].label).toBe("Attendre la réponse de votre AMO");
      expect(items[0].state).toBe("active");
    });

    it("marque l'item AMO completed si le parcours est sur ELIGIBILITE", () => {
      const items = getStepListItems(
        AmoMode.OBLIGATOIRE,
        StatutValidationAmo.LOGEMENT_ELIGIBLE,
        Step.ELIGIBILITE,
        false,
        null
      );
      expect(items[0].state).toBe("completed");
      expect(items[1].state).toBe("active"); // ELIGIBILITE active
    });
  });

  describe("Mode FACULTATIF — statut null (choix initial)", () => {
    it("renvoie 5 items dont 'Choix de l'accompagnement' actif", () => {
      const items = getStepListItems(AmoMode.FACULTATIF, null, Step.CHOIX_AMO, false, null);
      expect(items).toHaveLength(5);
      expect(items[0].label).toBe("Choix de l'accompagnement");
      expect(items[0].state).toBe("active");
      expect(items[1].state).toBe("pending");
    });
  });

  describe("Mode FACULTATIF — statut SANS_AMO", () => {
    it("renvoie 5 items, le 1er validé, et l'éligibilité active sur ELIGIBILITE/TODO", () => {
      const items = getStepListItems(AmoMode.FACULTATIF, StatutValidationAmo.SANS_AMO, Step.ELIGIBILITE, false, null);
      expect(items).toHaveLength(5);
      expect(items[0].label).toBe("Choix de l'accompagnement");
      expect(items[0].state).toBe("completed");
      expect(items[1].label).toContain("éligibilité");
      expect(items[1].state).toBe("active");
    });
  });

  describe("Mode FACULTATIF — AMO sélectionné (statut !== null && !== SANS_AMO)", () => {
    it("renvoie 6 items (choix validé + attente AMO active)", () => {
      const items = getStepListItems(AmoMode.FACULTATIF, StatutValidationAmo.EN_ATTENTE, Step.CHOIX_AMO, false, null);
      expect(items).toHaveLength(6);
      expect(items[0].label).toBe("Choix de l'accompagnement");
      expect(items[0].state).toBe("completed");
      expect(items[1].label).toBe("Attendre la réponse de votre AMO");
      expect(items[1].state).toBe("active");
      expect(items[2].state).toBe("pending");
    });

    it("statut LOGEMENT_ELIGIBLE + ELIGIBILITE → choix et attente completed, eligibilite active", () => {
      const items = getStepListItems(
        AmoMode.FACULTATIF,
        StatutValidationAmo.LOGEMENT_ELIGIBLE,
        Step.ELIGIBILITE,
        false,
        null
      );
      expect(items).toHaveLength(6);
      expect(items[0].state).toBe("completed");
      expect(items[1].state).toBe("completed");
      expect(items[2].state).toBe("active"); // ELIGIBILITE
    });

    it("demande d'accompagnement après autonomie : EN_ATTENTE alors que currentStep a déjà avancé à ELIGIBILITE → l'item AMO reste actif et le formulaire éligibilité est bloqué", () => {
      // Un demandeur en autonomie (SANS_AMO) a déjà fait avancer son parcours à ELIGIBILITE.
      // S'il redemande un accompagnement, statutAmo repasse à EN_ATTENTE sans que currentStep
      // ne revienne à CHOIX_AMO : l'item AMO ne doit pas s'afficher comme déjà répondu, et le
      // lien vers le formulaire (réinitialisé, cf. §2.10 FLOW-AND-SYNC.md) doit rester bloqué
      // tant que l'AMO n'a pas confirmé — sinon le demandeur pourrait le remplir avant.
      const items = getStepListItems(AmoMode.FACULTATIF, StatutValidationAmo.EN_ATTENTE, Step.ELIGIBILITE, false, null);
      expect(items[1].label).toBe("Attendre la réponse de votre AMO");
      expect(items[1].state).toBe("active");
      expect(items[2].label).toContain("éligibilité");
      expect(items[2].state).toBe("pending");
    });

    it("ne bloque pas le formulaire si le dossier d'éligibilité a déjà été transmis", () => {
      // Rien n'a été réinitialisé sur un dossier déposé : le bloquer priverait le demandeur
      // de l'accès à son dossier sans corriger le préremplissage.
      const items = getStepListItems(
        AmoMode.FACULTATIF,
        StatutValidationAmo.EN_ATTENTE,
        Step.ELIGIBILITE,
        false,
        DSStatus.ACCEPTE
      );
      expect(items[2].state).toBe("active");
    });
  });

  describe("État des étapes DS", () => {
    it("avant currentStep = completed, à currentStep = active sauf si DS accepté = completed, après = pending", () => {
      const items = getStepListItems(
        AmoMode.OBLIGATOIRE,
        StatutValidationAmo.LOGEMENT_ELIGIBLE,
        Step.DIAGNOSTIC,
        false,
        null
      );
      // [AMO, ELIGIBILITE, DIAGNOSTIC, DEVIS, FACTURES]
      expect(items[0].state).toBe("completed"); // AMO
      expect(items[1].state).toBe("completed"); // ELIGIBILITE (avant)
      expect(items[2].state).toBe("active"); // DIAGNOSTIC (courant)
      expect(items[3].state).toBe("pending"); // DEVIS (après)
    });

    it("DS accepté pour l'étape courante => completed", () => {
      const items = getStepListItems(
        AmoMode.OBLIGATOIRE,
        StatutValidationAmo.LOGEMENT_ELIGIBLE,
        Step.DIAGNOSTIC,
        true,
        null
      );
      expect(items[2].state).toBe("completed");
    });
  });
});

describe("getStepListItems - logement non éligible", () => {
  it("grise l'item « Choix de l'accompagnement » resté actif (son ancre ne mène plus nulle part)", () => {
    const actif = getStepListItems(AmoMode.FACULTATIF, null, Step.CHOIX_AMO, false, null);
    expect(actif[0].key).toBe("choix-accompagnement");
    expect(actif[0].state).toBe("active");

    const nonEligible = getStepListItems(AmoMode.FACULTATIF, null, Step.CHOIX_AMO, false, null, true);
    expect(nonEligible[0].state).toBe("pending");
  });

  it("laisse barrées les étapes déjà franchies", () => {
    const items = getStepListItems(
      AmoMode.FACULTATIF,
      StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
      Step.ELIGIBILITE,
      false,
      null,
      true
    );
    expect(items[0].state).toBe("completed");
    expect(items.some((i) => i.state === "active")).toBe(false);
  });

  it("désactive l'étape courante quand le logement est non éligible", () => {
    const actif = getStepListItems(AmoMode.FACULTATIF, StatutValidationAmo.SANS_AMO, Step.ELIGIBILITE, false, null);
    expect(actif[1].state).toBe("active");

    const nonEligible = getStepListItems(
      AmoMode.FACULTATIF,
      StatutValidationAmo.SANS_AMO,
      Step.ELIGIBILITE,
      false,
      null,
      true
    );
    expect(nonEligible[1].state).toBe("pending");
  });

  it("sans effet à CHOIX_AMO, où les étapes DS sont déjà pending", () => {
    const items = getStepListItems(AmoMode.FACULTATIF, null, Step.CHOIX_AMO, false, null, true);
    expect(items.slice(1).every((i) => i.state === "pending")).toBe(true);
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
