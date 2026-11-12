import { describe, it, expect } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { effetFusion, refusDetachement, refusFusion } from "./operations-structures";

const amo = { amo: true, allersVers: false };
const allersVers = { amo: false, allersVers: true };
const paire = { amo: true, allersVers: true };
const vide = { amo: false, allersVers: false };

describe("refusFusion", () => {
  it("accepte une AMO seule et un Aller-vers seul", () => {
    expect(refusFusion({ id: "a", habilitations: amo }, { id: "b", habilitations: allersVers })).toBeNull();
  });

  it("refuse deux habilitations de même type, la contrainte d'unicité ne le permettrait pas", () => {
    expect(refusFusion({ id: "a", habilitations: paire }, { id: "b", habilitations: amo })).toBe(
      "Les deux structures ont déjà une habilitation AMO"
    );
    expect(refusFusion({ id: "a", habilitations: allersVers }, { id: "b", habilitations: allersVers })).toBe(
      "Les deux structures ont déjà une habilitation Aller-vers"
    );
  });

  it("refuse de fusionner une structure avec elle-même", () => {
    expect(refusFusion({ id: "a", habilitations: amo }, { id: "a", habilitations: vide })).toBe(
      "Une structure ne peut pas être fusionnée avec elle-même"
    );
  });

  it("refuse deux structures sans habilitation", () => {
    expect(refusFusion({ id: "a", habilitations: vide }, { id: "b", habilitations: vide })).toBe(
      "Aucune des deux structures n'a d'habilitation"
    );
  });

  it("accepte qu'une structure sans habilitation rejoigne une structure qui en a", () => {
    expect(refusFusion({ id: "a", habilitations: amo }, { id: "b", habilitations: vide })).toBeNull();
  });
});

describe("effetFusion", () => {
  it("donne les deux rôles aux agents des deux structures", () => {
    expect(effetFusion(amo, allersVers)).toEqual({
      roleFinal: UserRole.AMO_ET_ALLERS_VERS,
      gainsAgentsCible: ["allersVers"],
      gainsAgentsSource: ["amo"],
    });
  });

  it("ne fait rien gagner aux agents de la cible quand la source n'apporte aucune habilitation", () => {
    expect(effetFusion(paire, vide)).toEqual({
      roleFinal: UserRole.AMO_ET_ALLERS_VERS,
      gainsAgentsCible: [],
      gainsAgentsSource: ["amo", "allersVers"],
    });
  });

  it("n'a aucun effet sans habilitation", () => {
    expect(effetFusion(vide, vide)).toBeNull();
  });
});

describe("refusDetachement", () => {
  it("accepte une structure à deux habilitations", () => {
    expect(refusDetachement(paire)).toBeNull();
  });

  it("refuse une structure à une seule habilitation", () => {
    expect(refusDetachement(amo)).toBe("Seule une structure qui a les deux habilitations peut en détacher une");
  });
});
