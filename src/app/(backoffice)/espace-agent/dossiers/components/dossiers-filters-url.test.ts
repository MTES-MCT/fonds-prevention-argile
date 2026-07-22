import { describe, it, expect } from "vitest";
import { parseDossiersFilters, serializeDossiersFilters, type DossiersFiltersState } from "./dossiers-filters-url";

const baseState: DossiersFiltersState = {
  scope: "all",
  search: "",
  epci: "",
  sort: "desc",
  page: 1,
  pageSize: 20,
  responsable: new Set(),
  etape: new Set(),
  enAttente: new Set(),
  precision: new Set(),
};

describe("parseDossiersFilters", () => {
  it("retombe sur les défauts quand l'URL est vide", () => {
    const result = parseDossiersFilters(new URLSearchParams(""), "mine");
    expect(result).toEqual({ ...baseState, scope: "mine" });
  });

  it("lit toutes les valeurs présentes", () => {
    const params = new URLSearchParams(
      "scope=all&q=dupont&epci=200054807&sort=asc&page=3&size=50&resp=AMO+A&resp=AMO+B&etape=Devis&attente=DDT&precision=todo"
    );
    const result = parseDossiersFilters(params, "mine");
    expect(result).toEqual({
      scope: "all",
      search: "dupont",
      epci: "200054807",
      sort: "asc",
      page: 3,
      pageSize: 50,
      responsable: new Set(["AMO A", "AMO B"]),
      etape: new Set(["Devis"]),
      enAttente: new Set(["DDT"]),
      precision: new Set(["todo"]),
    });
  });

  it("ignore un scope invalide et garde le défaut", () => {
    expect(parseDossiersFilters(new URLSearchParams("scope=bogus"), "mine").scope).toBe("mine");
  });

  it("ignore une page ou une taille invalides", () => {
    const result = parseDossiersFilters(new URLSearchParams("page=0&size=999"), "all");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});

describe("serializeDossiersFilters", () => {
  it("retourne une chaîne vide quand tout est au défaut", () => {
    expect(serializeDossiersFilters({ ...baseState, scope: "mine" }, "mine")).toBe("");
  });

  it("omet le scope quand il vaut le défaut, l'écrit sinon", () => {
    expect(serializeDossiersFilters({ ...baseState, scope: "all" }, "all")).toBe("");
    expect(serializeDossiersFilters({ ...baseState, scope: "all" }, "mine")).toBe("scope=all");
  });

  it("sérialise les Set en clés répétées", () => {
    const qs = serializeDossiersFilters(
      {
        ...baseState,
        responsable: new Set(["AMO A", "AMO B"]),
        enAttente: new Set(["DDT"]),
        precision: new Set(["todo", "correction"]),
      },
      "all"
    );
    const params = new URLSearchParams(qs);
    expect(params.getAll("resp")).toEqual(["AMO A", "AMO B"]);
    expect(params.getAll("attente")).toEqual(["DDT"]);
    expect(params.getAll("precision")).toEqual(["todo", "correction"]);
  });

  it("est l'inverse de parse (round-trip)", () => {
    const state: DossiersFiltersState = {
      scope: "all",
      search: "marc, à côté",
      epci: "200054807",
      sort: "asc",
      page: 2,
      pageSize: 100,
      responsable: new Set(["AMO A", "AMO B"]),
      etape: new Set(["Éligibilité"]),
      enAttente: new Set(["AMO", "DDT"]),
      precision: new Set(["eligibilite_depose"]),
    };
    const qs = serializeDossiersFilters(state, "mine");
    expect(parseDossiersFilters(new URLSearchParams(qs), "mine")).toEqual(state);
  });
});
