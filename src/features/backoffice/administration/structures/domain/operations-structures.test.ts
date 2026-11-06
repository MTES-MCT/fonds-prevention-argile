import { describe, it, expect } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { effetFusion, refusDetachement, refusFusion, roleApresDetachement } from "./operations-structures";

const amo = { amo: true, allersVers: false, expert: false };
const allersVers = { amo: false, allersVers: true, expert: false };
const expert = { amo: false, allersVers: false, expert: true };
const paire = { amo: true, allersVers: true, expert: false };
const amoExpert = { amo: true, allersVers: false, expert: true };
const vide = { amo: false, allersVers: false, expert: false };

describe("refusFusion", () => {
  it("accepte une AMO seule et un Aller-vers seul", () => {
    expect(refusFusion({ id: "a", habilitations: amo }, { id: "b", habilitations: allersVers })).toBeNull();
  });

  it("accepte qu'une entreprise AMO et sa fiche expert partagent une structure", () => {
    expect(refusFusion({ id: "a", habilitations: amo }, { id: "b", habilitations: expert })).toBeNull();
  });

  it("refuse deux habilitations de même type, la contrainte d'unicité ne le permettrait pas", () => {
    expect(refusFusion({ id: "a", habilitations: paire }, { id: "b", habilitations: amo })).toBe(
      "Les deux structures ont déjà une habilitation AMO"
    );
    expect(refusFusion({ id: "a", habilitations: allersVers }, { id: "b", habilitations: allersVers })).toBe(
      "Les deux structures ont déjà une habilitation Aller-vers"
    );
    expect(refusFusion({ id: "a", habilitations: amoExpert }, { id: "b", habilitations: expert })).toBe(
      "Les deux structures ont déjà une habilitation Expert"
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
    expect(refusFusion({ id: "a", habilitations: expert }, { id: "b", habilitations: vide })).toBeNull();
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

  it("ne fait gagner aucun rôle par l'habilitation expert", () => {
    expect(effetFusion(amo, expert)).toEqual({
      roleFinal: UserRole.AMO,
      gainsAgentsCible: [],
      gainsAgentsSource: ["amo"],
    });
  });

  it("ne donne aucun rôle sans AMO ni Aller-vers", () => {
    expect(effetFusion(expert, vide).roleFinal).toBeNull();
  });
});

describe("refusDetachement", () => {
  it("accepte une structure à deux habilitations, expert compris", () => {
    expect(refusDetachement(paire)).toBeNull();
    expect(refusDetachement(amoExpert)).toBeNull();
  });

  it("refuse une structure à une seule habilitation", () => {
    expect(refusDetachement(amo)).toBe("Seule une structure qui a au moins deux habilitations peut en détacher une");
    expect(refusDetachement(expert)).not.toBeNull();
  });
});

describe("roleApresDetachement", () => {
  it("garde le rôle de l'habilitation restante", () => {
    expect(roleApresDetachement(paire, "amo")).toBe(UserRole.ALLERS_VERS);
  });

  it("ne change aucun rôle quand l'habilitation détachée est l'expert", () => {
    expect(roleApresDetachement(amoExpert, "expert")).toBe(UserRole.AMO);
  });

  it("ne laisse aucun rôle quand seule l'habilitation expert reste", () => {
    expect(roleApresDetachement(amoExpert, "amo")).toBeNull();
  });
});
