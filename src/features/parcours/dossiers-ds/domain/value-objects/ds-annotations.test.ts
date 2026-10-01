import { describe, it, expect, vi, afterEach } from "vitest";
import {
  DS_ANNOTATION_LIEN_FPA_ELIGIBILITE,
  DS_ANNOTATION_TYPE_MENAGE_ELIGIBILITE,
  estInstructionAutomatiqueActive,
  idsAnnotationsInstruction,
  getAnnotationLienFpaEligibilite,
} from "./ds-annotations";

describe("getAnnotationLienFpaEligibilite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Les ids divergent par environnement (annotation ajoutée après le clonage) : c'est
  // toute la raison d'être de la résolution par numéro de démarche.
  it("renvoie l'id de prod pour la démarche 126061", () => {
    expect(getAnnotationLienFpaEligibilite(126061)).toBe("Q2hhbXAtNjY4NzQ1Mg==");
  });

  it("renvoie l'id de préprod pour la démarche 146377", () => {
    expect(getAnnotationLienFpaEligibilite(146377)).toBe("Q2hhbXAtNjY4NzQ3NQ==");
  });

  it("distingue bien les deux environnements", () => {
    expect(getAnnotationLienFpaEligibilite(126061)).not.toBe(getAnnotationLienFpaEligibilite(146377));
  });

  it("renvoie null et loggue un warn sur une démarche inconnue", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(getAnnotationLienFpaEligibilite(999999)).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("999999");
  });

  it("ne réutilise pas l'id des démarches diagnostic/devis", () => {
    // Erreur d'origine de la PR #272 : Champ-6352089 appartient à diagnostic et devis.
    expect(Object.values(DS_ANNOTATION_LIEN_FPA_ELIGIBILITE)).not.toContain("Q2hhbXAtNjM1MjA4OQ==");
  });
});

describe("idsAnnotationsInstruction", () => {
  afterEach(() => {
    delete DS_ANNOTATION_TYPE_MENAGE_ELIGIBILITE[146377];
  });

  it("renvoie l'id de l'annotation de l'avis en préprod", () => {
    expect(idsAnnotationsInstruction(146377).avisImpot).toBe("Q2hhbXAtNzAyMDIwNw==");
  });

  it("active chaque annotation séparément", () => {
    DS_ANNOTATION_TYPE_MENAGE_ELIGIBILITE[146377] = "Q2hhbXAtMQ==";

    expect(idsAnnotationsInstruction(146377)).toMatchObject({ typeMenage: "Q2hhbXAtMQ==", tauxSubvention: undefined });
  });

  it("considère active une démarche dès qu'une annotation y est répertoriée", () => {
    expect(estInstructionAutomatiqueActive(146377)).toBe(true);
    expect(estInstructionAutomatiqueActive(999)).toBe(false);
  });
});
