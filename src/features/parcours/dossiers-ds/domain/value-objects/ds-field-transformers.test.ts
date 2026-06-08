import { describe, it, expect } from "vitest";
import { toAdresseRueSeule, toCommuneValue } from "./ds-field-transformers";

describe("toAdresseRueSeule", () => {
  it("retire le code postal et ce qui le suit", () => {
    expect(toAdresseRueSeule("12 rue des Lilas 75001 Paris")).toBe("12 rue des Lilas");
  });

  it("retourne l'adresse telle quelle si pas de code postal", () => {
    expect(toAdresseRueSeule("12 rue des Lilas")).toBe("12 rue des Lilas");
  });

  it("retourne une chaîne vide pour une valeur absente", () => {
    expect(toAdresseRueSeule(undefined)).toBe("");
    expect(toAdresseRueSeule(null)).toBe("");
    expect(toAdresseRueSeule("")).toBe("");
  });
});

describe("toCommuneValue", () => {
  it("construit le tuple [codePostal, codeInsee] attendu par DS", () => {
    expect(toCommuneValue("75056", "12 rue des Lilas 75001 Paris")).toEqual(["75001", "75056"]);
  });

  it("gère un code INSEE numérique (gotcha JSONB)", () => {
    expect(toCommuneValue(75056, "12 rue des Lilas 75001 Paris")).toEqual(["75001", "75056"]);
  });

  it("renvoie un code postal vide si l'adresse n'en contient pas", () => {
    expect(toCommuneValue("75056", "12 rue des Lilas")).toEqual(["", "75056"]);
  });

  it("renvoie un code INSEE vide si la commune est absente", () => {
    expect(toCommuneValue(undefined, "12 rue des Lilas 75001 Paris")).toEqual(["75001", ""]);
  });
});
