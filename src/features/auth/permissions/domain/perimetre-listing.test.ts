import { describe, it, expect } from "vitest";
import { perimetreListing } from "./perimetre-listing";
import type { AgentScope } from "./types/agent-scope.types";

const scope = (overrides: Partial<AgentScope> = {}): AgentScope => ({
  isNational: false,
  entrepriseAmoIds: [],
  departements: [],
  epcis: [],
  canViewAllDossiers: false,
  canViewDossiersByEntreprise: false,
  canViewDossiersWithoutAmo: false,
  ...overrides,
});

describe("perimetreListing", () => {
  it("accès national aux dossiers → national", () => {
    expect(perimetreListing(scope({ canViewAllDossiers: true }))).toEqual({ kind: "national" });
  });

  it("territoire renseigné → territoire", () => {
    expect(perimetreListing(scope({ departements: ["36"], epcis: ["E1"] }))).toEqual({
      kind: "territoire",
      departements: ["36"],
      epcis: ["E1"],
    });
  });

  // Le droit « par entreprise » ne filtre pas le listing : seul, il ne doit rien ouvrir.
  it("droit par entreprise sans territoire → aucun", () => {
    expect(perimetreListing(scope({ canViewDossiersByEntreprise: true, entrepriseAmoIds: ["amo-1"] }))).toEqual({
      kind: "aucun",
    });
  });

  it("stats nationales sans accès aux dossiers (analyste national) → aucun", () => {
    expect(perimetreListing(scope({ isNational: true }))).toEqual({ kind: "aucun" });
  });
});
