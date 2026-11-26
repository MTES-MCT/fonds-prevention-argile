import { describe, expect, it } from "vitest";
import { estCheminInterne } from "./chemin-interne.utils";

describe("estCheminInterne", () => {
  it.each(["/mon-compte", "/espace-agent/dossiers/abc?onglet=tous#actions", "/", "/administration/agents"])(
    "accepte le chemin du site %s",
    (chemin) => {
      expect(estCheminInterne(chemin)).toBe(true);
    }
  );

  it.each([
    ["adresse absolue", "https://site-pirate.example/connexion"],
    ["adresse sans schéma", "//site-pirate.example"],
    ["barre oblique inversée, lue comme une barre par le navigateur", "/\\site-pirate.example"],
    ["tabulation, retirée par le navigateur", "/\t/site-pirate.example"],
    ["retour à la ligne, retiré par le navigateur", "/\n/site-pirate.example"],
    ["schéma javascript", "javascript:alert(1)"],
    ["chemin relatif", "mon-compte"],
    ["chaîne vide", ""],
    ["valeur absente", null],
    ["valeur indéfinie", undefined],
  ])("refuse : %s", (_cas, valeur) => {
    expect(estCheminInterne(valeur)).toBe(false);
  });
});
