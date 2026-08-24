import { describe, it, expect, vi, afterEach } from "vitest";
import { DS_ANNOTATION_LIEN_FPA_ELIGIBILITE, getAnnotationLienFpaEligibilite } from "./ds-annotations";

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
