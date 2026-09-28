import { describe, it, expect } from "vitest";
import { normaliserNomStructure, trouverCorrespondanceAllersVers } from "./correspondance-allers-vers";

const soliha24 = { id: "av-24", nom: "Soliha", departements: ["24"] };
const soliha54 = { id: "av-54", nom: "Soliha", departements: ["54"] };

describe("normaliserNomStructure", () => {
  it("ignore la casse, les accents, la ponctuation et les espaces multiples", () => {
    expect(normaliserNomStructure("  Allers-Vers   Héraut ")).toBe(normaliserNomStructure("allers vers heraut"));
  });
});

describe("trouverCorrespondanceAllersVers", () => {
  it("met à jour la structure de même nom partageant un département", () => {
    expect(trouverCorrespondanceAllersVers("SOLIHA", ["54"], [soliha24, soliha54])).toEqual({
      type: "mise_a_jour",
      id: "av-54",
    });
  });

  it("reconnaît une structure qui gagne un département", () => {
    expect(trouverCorrespondanceAllersVers("Soliha", ["54", "55"], [soliha24, soliha54])).toEqual({
      type: "mise_a_jour",
      id: "av-54",
    });
  });

  it("crée un homonyme d'un autre département", () => {
    expect(trouverCorrespondanceAllersVers("Soliha", ["57"], [soliha24, soliha54])).toEqual({ type: "creation" });
  });

  it("crée une structure de nom différent sur le même département", () => {
    expect(trouverCorrespondanceAllersVers("Soliha Lorraine", ["54"], [soliha54])).toEqual({ type: "creation" });
  });

  it("signale une ligne qui recouvre plusieurs homonymes", () => {
    const resultat = trouverCorrespondanceAllersVers("Soliha", ["24", "54"], [soliha24, soliha54]);
    expect(resultat.type).toBe("ambigue");
    if (resultat.type === "ambigue") {
      expect(resultat.structures.map((s) => s.id)).toEqual(["av-24", "av-54"]);
    }
  });
});
