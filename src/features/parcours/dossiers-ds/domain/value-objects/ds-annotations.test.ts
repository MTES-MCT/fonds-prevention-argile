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
    delete DS_ANNOTATION_TYPE_MENAGE_ELIGIBILITE[999];
  });

  it("renvoie les cinq annotations de la préprod", () => {
    expect(idsAnnotationsInstruction(146377)).toEqual({
      avisImpot: "Q2hhbXAtNzAyMDIwNw==",
      typeMenage: "Q2hhbXAtNzAzMDU1Mw==",
      tauxSubvention: "Q2hhbXAtNzAzMDU1NQ==",
      lienCarte: "Q2hhbXAtNzAzNTUwNw==",
      zoneAlea: "Q2hhbXAtNzAzNTUwOA==",
    });
  });

  it("active chaque annotation séparément", () => {
    DS_ANNOTATION_TYPE_MENAGE_ELIGIBILITE[999] = "Q2hhbXAtMQ==";

    expect(idsAnnotationsInstruction(999)).toEqual({
      avisImpot: undefined,
      typeMenage: "Q2hhbXAtMQ==",
      tauxSubvention: undefined,
    });
    expect(estInstructionAutomatiqueActive(999)).toBe(true);
  });

  it("considère active une démarche dès qu'une annotation y est répertoriée", () => {
    expect(estInstructionAutomatiqueActive(146377)).toBe(true);
    expect(estInstructionAutomatiqueActive(126061)).toBe(false);
  });
});
