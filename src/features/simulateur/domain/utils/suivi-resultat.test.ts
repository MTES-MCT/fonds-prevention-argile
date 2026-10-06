import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { empreinteSimulation, nomEvenementResultat, premierSuiviDeLaSession } from "./suivi-resultat";

describe("empreinteSimulation", () => {
  it("ne dépend pas de l'ordre des clés ni des champs indéfinis", () => {
    const a = { logement: { code_departement: "63", type: "maison" }, revenus: 1000 };
    const b = { revenus: 1000, logement: { type: "maison", code_departement: "63", commune: undefined } };

    expect(empreinteSimulation(a)).toBe(empreinteSimulation(b));
  });

  it("change dès qu'une réponse change", () => {
    const base = { logement: { code_departement: "63" } };

    expect(empreinteSimulation(base)).not.toBe(empreinteSimulation({ logement: { code_departement: "75" } }));
  });
});

describe("premierSuiviDeLaSession", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("ne laisse passer une même simulation qu'une fois par session", () => {
    expect(premierSuiviDeLaSession("abc")).toBe(true);
    expect(premierSuiviDeLaSession("abc")).toBe(false);
    expect(premierSuiviDeLaSession("def")).toBe(true);
  });

  it("suit quand même si le stockage de session est indisponible", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(premierSuiviDeLaSession("abc")).toBe(true);
    expect(premierSuiviDeLaSession("abc")).toBe(true);
  });

  it("borne le nombre d'empreintes gardées", () => {
    for (let i = 0; i < 60; i++) premierSuiviDeLaSession(`e${i}`);

    expect(JSON.parse(sessionStorage.getItem("fpa:simulations-suivies") ?? "[]")).toHaveLength(50);
    expect(premierSuiviDeLaSession("e0")).toBe(true);
  });
});

describe("nomEvenementResultat", () => {
  it("rend le code département au format officiel", () => {
    expect(nomEvenementResultat("3")).toBe("03");
    expect(nomEvenementResultat(63)).toBe("63");
    expect(nomEvenementResultat("2A")).toBe("2A");
    expect(nomEvenementResultat("971")).toBe("971");
  });

  it("ne nomme pas un résultat sans département", () => {
    expect(nomEvenementResultat(undefined)).toBeUndefined();
    expect(nomEvenementResultat("")).toBeUndefined();
    expect(nomEvenementResultat(null)).toBeUndefined();
  });
});
