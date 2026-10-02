import { describe, it, expect } from "vitest";
import { buildSyntheseResultat } from "./synthese-resultat.service";
import type { ComptePoints } from "./categorisation.service";

function compte(critique: number, vigilance: number): ComptePoints {
  return { critique, vigilance, a_verifier: 0, bonne_pratique: 0 };
}

describe("buildSyntheseResultat", () => {
  it("annonce l'aléa puis les points, au pluriel", () => {
    const synthese = buildSyntheseResultat("fort", compte(2, 3));

    expect(synthese.texte).toBe(
      "Votre maison est située en zone d'aléa fort. Nous avons identifié 2 points critiques et 3 points de vigilance."
    );
  });

  it("accorde au singulier", () => {
    expect(buildSyntheseResultat("moyen", compte(1, 1)).texte).toBe(
      "Votre maison est située en zone d'aléa moyen. Nous avons identifié 1 point critique et 1 point de vigilance."
    );
  });

  it("gère le zéro de chaque côté", () => {
    expect(buildSyntheseResultat("faible", compte(1, 0)).texte).toContain(
      "Nous avons identifié 1 point critique et aucun point de vigilance."
    );
    expect(buildSyntheseResultat("faible", compte(0, 2)).texte).toContain(
      "Nous n'avons identifié aucun point critique, mais 2 points de vigilance."
    );
    expect(buildSyntheseResultat("faible", compte(0, 0)).texte).toContain(
      "Nous n'avons identifié aucun point critique ni point de vigilance."
    );
  });

  it("ne parle pas de zone d'aléa hors zone argileuse", () => {
    expect(buildSyntheseResultat("nul", compte(0, 0)).texte).toMatch(/^Votre maison est située hors zone argileuse\./);
  });

  it("se passe de la phrase d'aléa quand il est inconnu", () => {
    expect(buildSyntheseResultat(undefined, compte(0, 1)).texte).toMatch(/^Nous n'avons identifié/);
  });

  it("le niveau suit le point le plus grave, l'aléa n'y entre pas", () => {
    expect(buildSyntheseResultat("fort", compte(1, 4)).niveau).toBe("critique");
    expect(buildSyntheseResultat("fort", compte(0, 1)).niveau).toBe("vigilance");
    expect(buildSyntheseResultat("fort", compte(0, 0)).niveau).toBe("aucun");
    expect(buildSyntheseResultat("nul", compte(1, 0)).niveau).toBe("critique");
  });

  it("porte le niveau dans le titre, pas seulement dans la couleur", () => {
    expect(buildSyntheseResultat("fort", compte(1, 0)).titre).toBe("Points critiques identifiés");
    expect(buildSyntheseResultat("fort", compte(0, 1)).titre).toBe("Points de vigilance identifiés");
    expect(buildSyntheseResultat("fort", compte(0, 0)).titre).toBe("Aucun point critique ni de vigilance");
  });
});
