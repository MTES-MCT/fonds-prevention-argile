import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDepartementsNonCouverts } from "./couverture-territoriale.service";

// db.select().from(table) : on renvoie les lignes préparées pour chaque table, dans
// l'ordre d'appel du service (AMO, communes AMO, départements Aller-vers).
const rows: unknown[][] = [];
vi.mock("@/shared/database/client", () => ({
  db: { select: () => ({ from: async () => rows.shift() ?? [] }) },
}));
vi.mock("@/shared/database/schema", () => ({
  entreprisesAmo: { departements: "departements" },
  entreprisesAmoCommunes: { codeInsee: "code_insee" },
  allersVersDepartements: { codeDepartement: "code_departement" },
}));

function prepare(amos: unknown[], communes: unknown[], avDepts: unknown[]) {
  rows.length = 0;
  rows.push(amos, communes, avDepts);
}

describe("getDepartementsNonCouverts", () => {
  beforeEach(() => {
    rows.length = 0;
  });

  it("renvoie les 11 départements du dispositif quand rien n'est rattaché", async () => {
    prepare([], [], []);
    await expect(getDepartementsNonCouverts()).resolves.toHaveLength(11);
  });

  it("retire un département couvert par un Aller-vers", async () => {
    prepare([], [], [{ codeDepartement: "36" }]);
    const nonCouverts = await getDepartementsNonCouverts();
    expect(nonCouverts).not.toContain("36");
    expect(nonCouverts).toContain("03");
  });

  it("retire un département couvert par le champ libre d'une AMO", async () => {
    prepare([{ departements: "Allier 03, Indre 36" }], [], []);
    const nonCouverts = await getDepartementsNonCouverts();
    expect(nonCouverts).not.toContain("03");
    expect(nonCouverts).not.toContain("36");
  });

  it("retire un département couvert par une commune d'AMO, et ignore un code INSEE invalide", async () => {
    prepare([], [{ codeInsee: "47001" }, { codeInsee: "xx" }], []);
    const nonCouverts = await getDepartementsNonCouverts();
    expect(nonCouverts).not.toContain("47");
    expect(nonCouverts).toContain("03");
  });

  it("tolère les codes sans zéro initial côté Aller-vers", async () => {
    prepare([], [], [{ codeDepartement: "3" }]);
    await expect(getDepartementsNonCouverts()).resolves.not.toContain("03");
  });
});
