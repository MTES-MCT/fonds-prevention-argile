import { describe, it, expect, beforeEach, vi } from "vitest";

import type { DepartementSEO, CommuneSEO, EpciSEO } from "@/features/seo";

// Mock des imports JSON - les données doivent être DANS la factory
vi.mock("../data/generated/departements.json", () => ({
  default: [
    {
      code: "03",
      nom: "Allier",
      slug: "allier",
      population: 337988,
      nombreCommunesRGA: 50,
      nombreEpciRGA: 5,
    },
    {
      code: "63",
      nom: "Puy-de-Dôme",
      slug: "puy-de-dome",
      population: 662152,
      nombreCommunesRGA: 80,
      nombreEpciRGA: 8,
    },
  ],
}));

vi.mock("../data/generated/communes.json", () => ({
  default: [
    {
      codeInsee: "03185",
      nom: "Montluçon",
      slug: "montlucon-03185",
      population: 33317,
      codeDepartement: "03",
      codeEpci: "200071082",
      codesPostaux: ["03100"],
      nomEpci: "CA Montluçon Communauté",
    },
    {
      codeInsee: "03310",
      nom: "Vichy",
      slug: "vichy-03310",
      population: 25702,
      codeDepartement: "03",
      codeEpci: "200071363",
      codesPostaux: ["03200"],
      nomEpci: "CA Vichy Communauté",
    },
    {
      codeInsee: "03190",
      nom: "Moulins",
      slug: "moulins-03190",
      population: 19344,
      codeDepartement: "03",
      codeEpci: "200071140",
      codesPostaux: ["03000"],
      nomEpci: "CA Moulins Communauté",
    },
    {
      codeInsee: "03095",
      nom: "Cusset",
      slug: "cusset-03095",
      population: 13329,
      codeDepartement: "03",
      codeEpci: "200071363",
      codesPostaux: ["03300"],
      nomEpci: "CA Vichy Communauté",
    },
    {
      codeInsee: "63113",
      nom: "Clermont-Ferrand",
      slug: "clermont-ferrand-63113",
      population: 147284,
      codeDepartement: "63",
      codeEpci: "246300701",
      codesPostaux: ["63000"],
      nomEpci: "Clermont Auvergne Métropole",
    },
  ],
}));

vi.mock("../data/generated/epci.json", () => ({
  default: [
    {
      codeSiren: "200071082",
      nom: "CA Montluçon Communauté",
      slug: "ca-montlucon-communaute-200071082",
      codesDepartements: ["03"],
      codesCommunes: ["03185"],
      population: 60000,
    },
    {
      codeSiren: "200071363",
      nom: "CA Vichy Communauté",
      slug: "ca-vichy-communaute-200071363",
      codesDepartements: ["03"],
      codesCommunes: ["03310", "03095"],
      population: 85000,
    },
    {
      codeSiren: "200071140",
      nom: "CA Moulins Communauté",
      slug: "ca-moulins-communaute-200071140",
      codesDepartements: ["03"],
      codesCommunes: ["03190"],
      population: 65000,
    },
    {
      codeSiren: "246300701",
      nom: "Clermont Auvergne Métropole",
      slug: "clermont-auvergne-metropole-246300701",
      codesDepartements: ["63"],
      codesCommunes: ["63113"],
      population: 300000,
    },
  ],
}));

// Import du service après les mocks
import {
  getAllDepartements,
  getDepartementBySlug,
  getDepartementByCode,
  getAllCommunes,
  getCommuneBySlug,
  getCommunesByDepartement,
  getTopCommunesByDepartement,
  getNextCommunesByPopulation,
  getCommunesByEpci,
  getTopCommunesByEpci,
  getAllEpcis,
  getEpciBySlug,
  getEpciBySiren,
  getEpcisByDepartement,
} from "./territoires.service";

describe("TerritoiresService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Départements", () => {
    describe("getAllDepartements", () => {
      it("devrait retourner tous les départements", () => {
        const result = getAllDepartements();

        expect(result).toHaveLength(2);
        expect(result[0].code).toBe("03");
        expect(result[1].code).toBe("63");
      });
    });

    describe("getDepartementBySlug", () => {
      it("devrait retourner le département correspondant au slug", () => {
        const result = getDepartementBySlug("allier");

        expect(result).toBeDefined();
        expect(result?.code).toBe("03");
        expect(result?.nom).toBe("Allier");
      });

      it("devrait retourner undefined si le slug n'existe pas", () => {
        const result = getDepartementBySlug("inexistant");

        expect(result).toBeUndefined();
      });
    });

    describe("getDepartementByCode", () => {
      it("devrait retourner le département correspondant au code", () => {
        const result = getDepartementByCode("63");

        expect(result).toBeDefined();
        expect(result?.slug).toBe("puy-de-dome");
        expect(result?.nom).toBe("Puy-de-Dôme");
      });

      it("devrait retourner undefined si le code n'existe pas", () => {
        const result = getDepartementByCode("99");

        expect(result).toBeUndefined();
      });
    });
  });

  describe("Communes", () => {
    describe("getAllCommunes", () => {
      it("devrait retourner toutes les communes", () => {
        const result = getAllCommunes();

        expect(result).toHaveLength(5);
      });
    });

    describe("getCommuneBySlug", () => {
      it("devrait retourner la commune correspondant au slug", () => {
        const result = getCommuneBySlug("montlucon-03185");

        expect(result).toBeDefined();
        expect(result?.nom).toBe("Montluçon");
        expect(result?.codeInsee).toBe("03185");
      });

      it("devrait retourner undefined si le slug n'existe pas", () => {
        const result = getCommuneBySlug("inexistant");

        expect(result).toBeUndefined();
      });
    });

    describe("getCommunesByDepartement", () => {
      it("devrait retourner les communes du département triées par population décroissante", () => {
        const result = getCommunesByDepartement("03");

        expect(result).toHaveLength(4);
        expect(result[0].nom).toBe("Montluçon"); // 33317
        expect(result[1].nom).toBe("Vichy"); // 25702
        expect(result[2].nom).toBe("Moulins"); // 19344
        expect(result[3].nom).toBe("Cusset"); // 13329
      });

      it("devrait retourner un tableau vide si le département n'a pas de communes", () => {
        const result = getCommunesByDepartement("99");

        expect(result).toHaveLength(0);
      });
    });

    describe("getTopCommunesByDepartement", () => {
      it("devrait retourner les X communes les plus peuplées", () => {
        const result = getTopCommunesByDepartement("03", 2);

        expect(result).toHaveLength(2);
        expect(result[0].nom).toBe("Montluçon");
        expect(result[1].nom).toBe("Vichy");
      });

      it("devrait retourner toutes les communes si limit > nombre de communes", () => {
        const result = getTopCommunesByDepartement("03", 10);

        expect(result).toHaveLength(4);
      });

      it("devrait utiliser la limite par défaut de 8", () => {
        const result = getTopCommunesByDepartement("03");

        expect(result).toHaveLength(4);
      });
    });

    describe("getNextCommunesByPopulation", () => {
      it("devrait retourner les communes suivantes par population", () => {
        const vichy: CommuneSEO = {
          codeInsee: "03310",
          nom: "Vichy",
          slug: "vichy-03310",
          population: 25702,
          codeDepartement: "03",
          codeEpci: "200071363",
          codesPostaux: ["03200"],
          nomEpci: "CA Vichy Communauté",
        };
        const result = getNextCommunesByPopulation(vichy, 2);

        expect(result).toHaveLength(2);
        expect(result[0].nom).toBe("Moulins");
        expect(result[1].nom).toBe("Cusset");
      });

      it("devrait compléter avec les communes précédentes si pas assez de suivantes", () => {
        const cusset: CommuneSEO = {
          codeInsee: "03095",
          nom: "Cusset",
          slug: "cusset-03095",
          population: 13329,
          codeDepartement: "03",
          codeEpci: "200071363",
          codesPostaux: ["03300"],
          nomEpci: "CA Vichy Communauté",
        };
        const result = getNextCommunesByPopulation(cusset, 3);

        expect(result).toHaveLength(3);
      });

      it("devrait retourner les premières communes si la commune n'est pas trouvée", () => {
        const communeInexistante: CommuneSEO = {
          codeInsee: "99999",
          nom: "Inexistante",
          slug: "inexistante-99999",
          population: 1000,
          codeDepartement: "03",
          codesPostaux: ["99999"],
        };

        const result = getNextCommunesByPopulation(communeInexistante, 2);

        expect(result).toHaveLength(2);
        expect(result[0].nom).toBe("Montluçon");
        expect(result[1].nom).toBe("Vichy");
      });
    });

    describe("getCommunesByEpci", () => {
      it("devrait retourner les communes de l'EPCI triées par population", () => {
        const result = getCommunesByEpci("200071363");

        expect(result).toHaveLength(2);
        expect(result[0].nom).toBe("Vichy");
        expect(result[1].nom).toBe("Cusset");
      });

      it("devrait retourner un tableau vide si l'EPCI n'a pas de communes", () => {
        const result = getCommunesByEpci("inexistant");

        expect(result).toHaveLength(0);
      });
    });

    describe("getTopCommunesByEpci", () => {
      it("devrait retourner les X communes les plus peuplées de l'EPCI", () => {
        const result = getTopCommunesByEpci("200071363", 1);

        expect(result).toHaveLength(1);
        expect(result[0].nom).toBe("Vichy");
      });

      it("devrait utiliser la limite par défaut de 8", () => {
        const result = getTopCommunesByEpci("200071363");

        expect(result).toHaveLength(2);
      });
    });
  });

  describe("EPCI", () => {
    describe("getAllEpcis", () => {
      it("devrait retourner tous les EPCI", () => {
        const result = getAllEpcis();

        expect(result).toHaveLength(4);
      });
    });

    describe("getEpciBySlug", () => {
      it("devrait retourner l'EPCI correspondant au slug", () => {
        const result = getEpciBySlug("ca-vichy-communaute-200071363");

        expect(result).toBeDefined();
        expect(result?.nom).toBe("CA Vichy Communauté");
        expect(result?.codeSiren).toBe("200071363");
      });

      it("devrait retourner undefined si le slug n'existe pas", () => {
        const result = getEpciBySlug("inexistant");

        expect(result).toBeUndefined();
      });
    });

    describe("getEpciBySiren", () => {
      it("devrait retourner l'EPCI correspondant au code SIREN", () => {
        const result = getEpciBySiren("246300701");

        expect(result).toBeDefined();
        expect(result?.nom).toBe("Clermont Auvergne Métropole");
      });

      it("devrait retourner undefined si le code SIREN n'existe pas", () => {
        const result = getEpciBySiren("000000000");

        expect(result).toBeUndefined();
      });
    });

    describe("getEpcisByDepartement", () => {
      it("devrait retourner les EPCI du département", () => {
        const result = getEpcisByDepartement("03");

        expect(result).toHaveLength(3);
        expect(result.map((e) => e.nom)).toContain("CA Montluçon Communauté");
        expect(result.map((e) => e.nom)).toContain("CA Vichy Communauté");
        expect(result.map((e) => e.nom)).toContain("CA Moulins Communauté");
      });

      it("devrait retourner un tableau vide si le département n'a pas d'EPCI", () => {
        const result = getEpcisByDepartement("99");

        expect(result).toHaveLength(0);
      });

      it("devrait retourner les EPCI même s'ils couvrent plusieurs départements", () => {
        const result = getEpcisByDepartement("63");

        expect(result).toHaveLength(1);
        expect(result[0].nom).toBe("Clermont Auvergne Métropole");
      });
    });
  });
});
