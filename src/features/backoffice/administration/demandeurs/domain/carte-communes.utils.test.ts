import { describe, expect, it } from "vitest";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import {
  codeDepartementDeCommune,
  compterDemandeursParCommune,
  construireCarteCommunes,
  normaliserCodeCommune,
  repartirParDepartement,
} from "./carte-communes.utils";

function demandeur(commune: unknown, communeNom = "Montluçon"): UserWithParcoursDetails {
  return {
    rgaSimulation: commune === undefined ? null : { logement: { commune, commune_nom: communeNom } },
  } as unknown as UserWithParcoursDetails;
}

describe("normaliserCodeCommune", () => {
  it("rend le zéro de tête perdu par un code stocké en nombre", () => {
    expect(normaliserCodeCommune(3185)).toBe("03185");
  });

  it("accepte la Corse et les outre-mer", () => {
    expect(normaliserCodeCommune("2a004")).toBe("2A004");
    expect(normaliserCodeCommune("97411")).toBe("97411");
  });

  it("refuse ce qui n'est pas un code INSEE", () => {
    expect(normaliserCodeCommune("")).toBeNull();
    expect(normaliserCodeCommune("Montluçon")).toBeNull();
    expect(normaliserCodeCommune(undefined)).toBeNull();
  });
});

describe("codeDepartementDeCommune", () => {
  it("lit trois caractères outre-mer, deux ailleurs", () => {
    expect(codeDepartementDeCommune("97411")).toBe("974");
    expect(codeDepartementDeCommune("2B033")).toBe("2B");
    expect(codeDepartementDeCommune("03185")).toBe("03");
  });
});

describe("compterDemandeursParCommune", () => {
  it("regroupe par commune, de la plus fournie à la moins fournie, sans les demandeurs non localisés", () => {
    const comptes = compterDemandeursParCommune([
      demandeur("03185"),
      demandeur(3185),
      demandeur("03190", "Moulins"),
      demandeur(undefined),
      demandeur(""),
    ]);

    expect(comptes).toEqual([
      { code: "03185", nom: "Montluçon", demandeurs: 2 },
      { code: "03190", nom: "Moulins", demandeurs: 1 },
    ]);
  });
});

describe("construireCarteCommunes", () => {
  it("pose chaque commune sur son centre et écarte celles dont le centre est inconnu", () => {
    const carte = construireCarteCommunes(
      [
        { code: "03185", nom: "Montluçon", demandeurs: 2 },
        { code: "99999", nom: "Inconnue", demandeurs: 4 },
      ],
      { "03185": [2.6, 46.34] }
    );

    expect(carte.features).toEqual([
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [2.6, 46.34] },
        properties: { code: "03185", nom: "Montluçon", demandeurs: 2 },
      },
    ]);
  });
});

describe("repartirParDepartement", () => {
  it("sépare les communes de deux départements voisins, Corse et outre-mer compris", () => {
    const carte = construireCarteCommunes(
      [
        { code: "24322", nom: "Périgueux", demandeurs: 3 },
        { code: "47001", nom: "Agen", demandeurs: 2 },
        { code: "24037", nom: "Bergerac", demandeurs: 1 },
        { code: "2A004", nom: "Ajaccio", demandeurs: 1 },
        { code: "97411", nom: "Saint-Denis", demandeurs: 1 },
      ],
      {
        "24322": [0.72, 45.18],
        "47001": [0.62, 44.2],
        "24037": [0.48, 44.85],
        "2A004": [8.74, 41.92],
        "97411": [55.45, -20.88],
      }
    );

    const parDepartement = repartirParDepartement(carte);

    expect([...parDepartement.keys()]).toEqual(["24", "47", "2A", "974"]);
    expect(parDepartement.get("24")?.features.map((f) => f.properties.nom)).toEqual(["Périgueux", "Bergerac"]);
  });
});
