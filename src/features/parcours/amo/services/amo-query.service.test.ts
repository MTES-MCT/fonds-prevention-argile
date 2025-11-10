import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAmosForCodeInsee,
  getAllAmosWithCommunes,
  getUserSelectedAmo,
  getUserRejectedAmo,
  getAmoById,
  checkAmoCoversCodeInsee,
} from "./amo-query.service";
import { db } from "@/shared/database/client";
import { getCodeDepartementFromCodeInsee } from "../utils/amo.utils";

// Mock des dépendances
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    selectDistinct: vi.fn(),
  },
}));

vi.mock("../utils/amo.utils", () => ({
  getCodeDepartementFromCodeInsee: vi.fn(),
}));

// Helpers pour mocker les chaînes Drizzle
const mockDbSelect = (data: unknown) => {
  const mockLimit = vi.fn().mockResolvedValue(data);
  const mockWhere = vi.fn().mockReturnValue({
    limit: mockLimit,
  });
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
  });

  return {
    from: mockFrom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

const mockDbSelectWithInnerJoin = (data: unknown) => {
  const mockLimit = vi.fn().mockResolvedValue(data);
  const mockWhere = vi.fn().mockReturnValue({
    limit: mockLimit,
  });
  const mockInnerJoin = vi.fn().mockReturnValue({
    where: mockWhere,
  });
  const mockFrom = vi.fn().mockReturnValue({
    innerJoin: mockInnerJoin,
  });

  return {
    from: mockFrom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

const mockDbSelectWithLeftJoin = (data: unknown) => {
  const mockOrderBy = vi.fn().mockResolvedValue(data);
  const mockLeftJoin = vi.fn().mockReturnValue({
    orderBy: mockOrderBy,
  });
  const mockFrom = vi.fn().mockReturnValue({
    leftJoin: mockLeftJoin,
  });

  return {
    from: mockFrom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

const mockDbSelectWithLeftJoinAndWhere = (data: unknown) => {
  const mockLimit = vi.fn().mockResolvedValue(data);
  const mockWhere = vi.fn().mockReturnValue({
    limit: mockLimit,
  });
  const mockLeftJoin = vi.fn().mockReturnValue({
    where: mockWhere,
  });
  const mockFrom = vi.fn().mockReturnValue({
    leftJoin: mockLeftJoin,
  });

  return {
    from: mockFrom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

const mockDbSelectDistinctWithInnerJoin = (data: unknown) => {
  const mockWhere = vi.fn().mockResolvedValue(data);
  const mockInnerJoin = vi.fn().mockReturnValue({
    where: mockWhere,
  });
  const mockFrom = vi.fn().mockReturnValue({
    innerJoin: mockInnerJoin,
  });

  return {
    from: mockFrom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

const mockDbSelectSimple = (data: unknown) => {
  const mockWhere = vi.fn().mockResolvedValue(data);
  const mockFrom = vi.fn().mockReturnValue({
    where: mockWhere,
  });

  return {
    from: mockFrom,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
};

describe("amo-query.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAmosForCodeInsee", () => {
    const userId = "user-123";
    const codeInsee = "75001";
    const codeDepartement = "75";

    const mockParcoursWithRGA = {
      id: "parcours-789",
      rgaSimulationData: {
        logement: {
          commune: codeInsee,
          adresse: "123 rue test",
          code_region: "11",
          code_departement: "75",
          epci: "200054781",
          commune_nom: "Paris 1er",
          coordonnees: "48.8566,2.3522",
          clef_ban: "test_ban",
          commune_denormandie: false,
          annee_de_construction: "1990",
          rnb: "RNB_TEST",
          niveaux: 2,
          zone_dexposition: "moyen",
          type: "maison",
          mitoyen: true,
          proprietaire_occupant: true,
        },
        taxeFonciere: { commune_eligible: true },
        rga: {
          assure: true,
          indemnise_indemnise_rga: false,
          sinistres: "saine",
        },
        menage: { revenu_rga: 35000, personnes: 4 },
        vous: { proprietaire_condition: true, proprietaire_occupant_rga: true },
        simulatedAt: new Date().toISOString(),
      },
    };

    const mockAmo1 = {
      id: "amo-1",
      nom: "AMO Paris 1",
      siret: "12345678901234",
      departements: ["75"],
      emails: "contact@amo1.fr",
      telephone: "0123456789",
      adresse: "1 rue de Paris",
    };

    const mockAmo2 = {
      id: "amo-2",
      nom: "AMO Ile-de-France",
      siret: "98765432109876",
      departements: ["75", "77", "78"],
      emails: "contact@amo2.fr",
      telephone: "0123456788",
      adresse: "2 rue de France",
    };

    const mockAmo3 = {
      id: "amo-3",
      nom: "AMO Paris Central",
      siret: "11111111111111",
      departements: ["75"],
      emails: "contact@amo3.fr",
      telephone: "0123456787",
      adresse: "3 rue Centrale",
    };

    beforeEach(() => {
      vi.mocked(getCodeDepartementFromCodeInsee).mockReturnValue(
        codeDepartement
      );
    });

    it("devrait retourner les AMO qui couvrent le code INSEE spécifique", async () => {
      // Mock pour récupérer le parcours avec RGA
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelect([mockParcoursWithRGA])
      );

      // Mock pour AMO par code INSEE
      vi.mocked(db.selectDistinct).mockReturnValueOnce(
        mockDbSelectDistinctWithInnerJoin([mockAmo1])
      );

      // Mock pour AMO par département (vide)
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelectSimple([]));

      const result = await getAmosForCodeInsee(userId);

      expect(result).toEqual([mockAmo1]);
      expect(getCodeDepartementFromCodeInsee).toHaveBeenCalledWith(codeInsee);
    });

    it("devrait retourner les AMO qui couvrent le département entier", async () => {
      // Mock pour récupérer le parcours avec RGA
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelect([mockParcoursWithRGA])
      );

      // Mock pour AMO par code INSEE (vide)
      vi.mocked(db.selectDistinct).mockReturnValueOnce(
        mockDbSelectDistinctWithInnerJoin([])
      );

      // Mock pour AMO par département
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelectSimple([mockAmo2]));

      const result = await getAmosForCodeInsee(userId);

      expect(result).toEqual([mockAmo2]);
    });

    it("devrait fusionner et dédupliquer les AMO des deux sources", async () => {
      // Mock pour récupérer le parcours avec RGA
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelect([mockParcoursWithRGA])
      );

      // Mock pour AMO par code INSEE
      vi.mocked(db.selectDistinct).mockReturnValueOnce(
        mockDbSelectDistinctWithInnerJoin([mockAmo1, mockAmo3])
      );

      // Mock pour AMO par département (contient aussi mockAmo1)
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectSimple([mockAmo1, mockAmo2])
      );

      const result = await getAmosForCodeInsee(userId);

      // mockAmo1 ne doit apparaître qu'une fois
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([mockAmo1, mockAmo2, mockAmo3])
      );

      // Vérifier qu'il n'y a pas de doublons
      const ids = result.map((amo) => amo.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("devrait retourner un tableau vide si aucune AMO ne couvre la zone", async () => {
      // Mock pour récupérer le parcours avec RGA
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelect([mockParcoursWithRGA])
      );

      // Mock pour AMO par code INSEE (vide)
      vi.mocked(db.selectDistinct).mockReturnValueOnce(
        mockDbSelectDistinctWithInnerJoin([])
      );

      // Mock pour AMO par département (vide)
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelectSimple([]));

      const result = await getAmosForCodeInsee(userId);

      expect(result).toEqual([]);
    });

    it("devrait lancer une erreur si le code INSEE est manquant", async () => {
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelect([{ id: "parcours-789", rgaSimulationData: null }])
      );

      await expect(getAmosForCodeInsee(userId)).rejects.toThrow(
        "Simulation RGA non complétée (code INSEE manquant)"
      );
    });

    it("devrait lancer une erreur si le parcours n'est pas trouvé", async () => {
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([]));

      await expect(getAmosForCodeInsee(userId)).rejects.toThrow(
        "Simulation RGA non complétée (code INSEE manquant)"
      );
    });

    it("devrait appeler getCodeDepartementFromCodeInsee avec le bon code INSEE", async () => {
      // Mock pour récupérer le parcours avec RGA
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelect([mockParcoursWithRGA])
      );

      // Mock pour AMO par code INSEE (vide)
      vi.mocked(db.selectDistinct).mockReturnValueOnce(
        mockDbSelectDistinctWithInnerJoin([])
      );

      // Mock pour AMO par département (vide)
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelectSimple([]));

      await getAmosForCodeInsee(userId);

      expect(getCodeDepartementFromCodeInsee).toHaveBeenCalledWith(codeInsee);
      expect(getCodeDepartementFromCodeInsee).toHaveBeenCalledTimes(1);
    });
  });

  describe("getAllAmosWithCommunes", () => {
    it("devrait retourner toutes les AMO avec leurs communes groupées", async () => {
      const mockRows = [
        {
          id: "amo-1",
          nom: "AMO Paris",
          siret: "12345678901234",
          departements: ["75"],
          emails: "contact@amo1.fr",
          telephone: "0123456789",
          adresse: "1 rue de Paris",
          codeInsee: "75001",
        },
        {
          id: "amo-1",
          nom: "AMO Paris",
          siret: "12345678901234",
          departements: ["75"],
          emails: "contact@amo1.fr",
          telephone: "0123456789",
          adresse: "1 rue de Paris",
          codeInsee: "75002",
        },
        {
          id: "amo-2",
          nom: "AMO Lyon",
          siret: "98765432109876",
          departements: ["69"],
          emails: "contact@amo2.fr",
          telephone: "0123456788",
          adresse: "2 rue de Lyon",
          codeInsee: "69001",
        },
      ];

      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectWithLeftJoin(mockRows)
      );

      const result = await getAllAmosWithCommunes();

      expect(result).toHaveLength(2);

      const amo1 = result.find((a) => a.id === "amo-1");
      expect(amo1).toBeDefined();
      expect(amo1?.communes).toEqual([
        { codeInsee: "75001" },
        { codeInsee: "75002" },
      ]);

      const amo2 = result.find((a) => a.id === "amo-2");
      expect(amo2).toBeDefined();
      expect(amo2?.communes).toEqual([{ codeInsee: "69001" }]);
    });

    it("devrait gérer les AMO sans communes associées", async () => {
      const mockRows = [
        {
          id: "amo-1",
          nom: "AMO Paris",
          siret: "12345678901234",
          departements: ["75"],
          emails: "contact@amo1.fr",
          telephone: "0123456789",
          adresse: "1 rue de Paris",
          codeInsee: null,
        },
      ];

      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectWithLeftJoin(mockRows)
      );

      const result = await getAllAmosWithCommunes();

      expect(result).toHaveLength(1);
      expect(result[0].communes).toEqual([]);
    });

    it("devrait retourner un tableau vide si aucune AMO n'existe", async () => {
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelectWithLeftJoin([]));

      const result = await getAllAmosWithCommunes();

      expect(result).toEqual([]);
    });
  });

  describe("getUserSelectedAmo", () => {
    const userId = "user-123";
    const mockParcours = { id: "parcours-789" };
    const mockAmo = {
      id: "amo-1",
      nom: "AMO Sélectionnée",
      siret: "12345678901234",
      departements: ["75"],
      emails: "contact@amo.fr",
      telephone: "0123456789",
      adresse: "1 rue AMO",
    };

    it("devrait retourner l'AMO sélectionnée par l'utilisateur", async () => {
      // Mock pour récupérer le parcours
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([mockParcours]));

      // Mock pour récupérer l'AMO
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectWithInnerJoin([mockAmo])
      );

      const result = await getUserSelectedAmo(userId);

      expect(result).toEqual(mockAmo);
    });

    it("devrait retourner null si aucune AMO n'est sélectionnée", async () => {
      // Mock pour récupérer le parcours
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([mockParcours]));

      // Mock pour récupérer l'AMO (vide)
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelectWithInnerJoin([]));

      const result = await getUserSelectedAmo(userId);

      expect(result).toBeNull();
    });

    it("devrait lancer une erreur si le parcours n'est pas trouvé", async () => {
      // Mock pour ne pas trouver le parcours
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([]));

      await expect(getUserSelectedAmo(userId)).rejects.toThrow(
        "Parcours non trouvé"
      );
    });
  });

  describe("getUserRejectedAmo", () => {
    const userId = "user-123";
    const mockParcours = { id: "parcours-789" };
    const mockAmoRefusee = {
      id: "amo-1",
      nom: "AMO Qui a Refusé",
    };

    it("devrait retourner l'AMO qui a refusé l'accompagnement", async () => {
      // Mock pour récupérer le parcours
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([mockParcours]));

      // Mock pour récupérer l'AMO refusée
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectWithInnerJoin([mockAmoRefusee])
      );

      const result = await getUserRejectedAmo(userId);

      expect(result).toEqual(mockAmoRefusee);
    });

    it("devrait retourner null si aucune AMO n'a refusé", async () => {
      // Mock pour récupérer le parcours
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([mockParcours]));

      // Mock pour récupérer l'AMO refusée (vide)
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelectWithInnerJoin([]));

      const result = await getUserRejectedAmo(userId);

      expect(result).toBeNull();
    });

    it("devrait lancer une erreur si le parcours n'est pas trouvé", async () => {
      // Mock pour ne pas trouver le parcours
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([]));

      await expect(getUserRejectedAmo(userId)).rejects.toThrow(
        "Parcours non trouvé"
      );
    });
  });

  describe("getAmoById", () => {
    const amoId = "amo-123";
    const mockAmo = {
      id: amoId,
      nom: "AMO Test",
      siret: "12345678901234",
      departements: ["75"],
      emails: "contact@amo.fr",
      telephone: "0123456789",
      adresse: "1 rue AMO",
    };

    it("devrait retourner une AMO par son ID", async () => {
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([mockAmo]));

      const result = await getAmoById(amoId);

      expect(result).toEqual(mockAmo);
    });

    it("devrait retourner null si l'AMO n'est pas trouvée", async () => {
      vi.mocked(db.select).mockReturnValueOnce(mockDbSelect([]));

      const result = await getAmoById("amo-inexistant");

      expect(result).toBeNull();
    });
  });

  describe("checkAmoCoversCodeInsee", () => {
    const amoId = "amo-123";
    const codeInsee = "75001";
    const codeDepartement = "75";

    beforeEach(() => {
      vi.mocked(getCodeDepartementFromCodeInsee).mockReturnValue(
        codeDepartement
      );
    });

    it("devrait retourner true si l'AMO couvre via une commune spécifique", async () => {
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectWithLeftJoinAndWhere([{ id: amoId }])
      );

      const result = await checkAmoCoversCodeInsee(amoId, codeInsee);

      expect(result).toBe(true);
      expect(getCodeDepartementFromCodeInsee).toHaveBeenCalledWith(codeInsee);
    });

    it("devrait retourner true si l'AMO couvre via le département entier", async () => {
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectWithLeftJoinAndWhere([{ id: amoId }])
      );

      const result = await checkAmoCoversCodeInsee(amoId, codeInsee);

      expect(result).toBe(true);
    });

    it("devrait retourner false si l'AMO ne couvre pas le code INSEE", async () => {
      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectWithLeftJoinAndWhere([])
      );

      const result = await checkAmoCoversCodeInsee(amoId, codeInsee);

      expect(result).toBe(false);
    });

    it("devrait gérer les codes INSEE d'outre-mer (3 chiffres)", async () => {
      const codeInseeOM = "97411"; // Réunion
      const codeDeptOM = "974";

      vi.mocked(getCodeDepartementFromCodeInsee).mockReturnValue(codeDeptOM);

      vi.mocked(db.select).mockReturnValueOnce(
        mockDbSelectWithLeftJoinAndWhere([{ id: amoId }])
      );

      const result = await checkAmoCoversCodeInsee(amoId, codeInseeOM);

      expect(result).toBe(true);
      expect(getCodeDepartementFromCodeInsee).toHaveBeenCalledWith(codeInseeOM);
    });
  });
});
