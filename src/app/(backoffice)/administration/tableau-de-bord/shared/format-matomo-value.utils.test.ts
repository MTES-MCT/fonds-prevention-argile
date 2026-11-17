import { describe, it, expect } from "vitest";
import { completerInfobulle, formaterHeureCalcul } from "./format-matomo-value.utils";

// Heures locales : la mention s'affiche dans le fuseau du navigateur.
const MAINTENANT = new Date(2026, 10, 16, 18, 30);

describe("formaterHeureCalcul", () => {
  it("ne donne que l'heure pour un chiffre calculé aujourd'hui", () => {
    const calculeLe = new Date(2026, 10, 16, 9, 5).toISOString();

    expect(formaterHeureCalcul(calculeLe, MAINTENANT)).toBe("Chiffre calculé à 09:05.");
  });

  it("précise le jour pour un chiffre calculé la veille", () => {
    const calculeLe = new Date(2026, 10, 15, 23, 40).toISOString();

    expect(formaterHeureCalcul(calculeLe, MAINTENANT)).toBe("Chiffre calculé le 15/11 à 23:40.");
  });

  it("ne dit rien sans heure connue ou sur une date illisible", () => {
    expect(formaterHeureCalcul(null, MAINTENANT)).toBeNull();
    expect(formaterHeureCalcul(undefined, MAINTENANT)).toBeNull();
    expect(formaterHeureCalcul("pas une date", MAINTENANT)).toBeNull();
  });
});

describe("completerInfobulle", () => {
  it("laisse l'infobulle telle quelle sans heure de calcul", () => {
    expect(completerInfobulle("Données Matomo.", null)).toBe("Données Matomo.");
  });

  it("ajoute la mention après le texte", () => {
    const calculeLe = new Date();
    calculeLe.setHours(14, 20, 0, 0);

    expect(completerInfobulle("Données Matomo.", calculeLe.toISOString())).toBe(
      "Données Matomo. Chiffre calculé à 14:20."
    );
  });
});
