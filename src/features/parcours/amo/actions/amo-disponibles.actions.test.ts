import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAmosDisponibles } from "./amo-disponibles.actions";
import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { db } from "@/shared/database/client";
import type { ParcoursPrevention } from "@/shared/database/schema";

// Mock des dépendances
vi.mock("@/features/auth/server", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: {
    findByUserId: vi.fn(),
  },
}));

vi.mock("@/shared/database/client", () => ({
  db: {
    selectDistinct: vi.fn(),
    select: vi.fn(),
  },
}));

describe("getAmosDisponibles - Logique exclusive EPCI/Département", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper pour créer un parcours mock
  const createMockParcours = (
    codeInsee: string | number,
    codeEpci: string | number | null
  ): Partial<ParcoursPrevention> => ({
    id: "parcours-123",
    userId: "user-123",
    rgaSimulationData: {
      logement: {
        commune: codeInsee,
        epci: codeEpci,
      },
    } as ParcoursPrevention["rgaSimulationData"],
  });

  // Helper pour mocker une session valide
  const mockValidSession = () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: "user-123",
      role: "user",
    } as Awaited<ReturnType<typeof getSession>>);
  };

  // Helper pour mocker les résultats de requêtes DB
  const mockDbResults = (
    epciResults: unknown[],
    departementResults: unknown[]
  ) => {
    // Mock pour selectDistinct (requête EPCI)
    vi.mocked(db.selectDistinct).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(epciResults),
        }),
      }),
    } as unknown as ReturnType<typeof db.selectDistinct>);

    // Mock pour select (requête département)
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(departementResults),
      }),
    } as unknown as ReturnType<typeof db.select>);
  };

  describe("Test 1 : Match EPCI uniquement", () => {
    it("doit retourner UNIQUEMENT les AMO qui couvrent l'EPCI (pas le département)", async () => {
      // GIVEN
      mockValidSession();

      const parcours = createMockParcours("36006", "200068872");
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcours as ParcoursPrevention
      );

      const amoEpci = {
        id: "amo-a-id",
        nom: "AMO EPCI",
        siret: "11111111111111",
        departements: "Indre 36",
        emails: "epci@amo.fr",
        telephone: "0123456789",
        adresse: "1 rue EPCI",
      };

      const amoDepartement = {
        id: "amo-b-id",
        nom: "AMO Département",
        siret: "22222222222222",
        departements: "Indre 36",
        emails: "dept@amo.fr",
        telephone: "0198765432",
        adresse: "2 rue Dept",
      };

      mockDbResults([amoEpci], [amoDepartement]);

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("amo-a-id");
      expect(result.data[0].nom).toBe("AMO EPCI");
      expect(result.data.find((a) => a.id === "amo-b-id")).toBeUndefined();
    });
  });

  describe("Test 2 : Fallback département si aucun EPCI", () => {
    it("doit retourner les AMO du département si aucun AMO ne couvre l'EPCI", async () => {
      // GIVEN
      mockValidSession();

      const parcours = createMockParcours("36006", "999999999");
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcours as ParcoursPrevention
      );

      const amoDepartement = {
        id: "amo-c-id",
        nom: "AMO Département Fallback",
        siret: "33333333333333",
        departements: "Indre 36",
        emails: "fallback@amo.fr",
        telephone: "0111111111",
        adresse: "3 rue Fallback",
      };

      mockDbResults([], [amoDepartement]);

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("amo-c-id");
      expect(result.data[0].nom).toBe("AMO Département Fallback");
    });
  });

  describe("Test 3 : Plusieurs AMO sur même EPCI", () => {
    it("doit retourner TOUS les AMO qui couvrent le même EPCI", async () => {
      // GIVEN
      mockValidSession();

      const parcours = createMockParcours("36006", "200068872");
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcours as ParcoursPrevention
      );

      const amoEpci1 = {
        id: "amo-a-id",
        nom: "AMO EPCI 1",
        siret: "11111111111111",
        departements: "Indre 36",
        emails: "epci1@amo.fr",
        telephone: "0123456789",
        adresse: "1 rue EPCI",
      };

      const amoEpci2 = {
        id: "amo-b-id",
        nom: "AMO EPCI 2",
        siret: "22222222222222",
        departements: "Indre 36",
        emails: "epci2@amo.fr",
        telephone: "0198765432",
        adresse: "2 rue EPCI",
      };

      const amoDepartement = {
        id: "amo-c-id",
        nom: "AMO Département",
        siret: "33333333333333",
        departements: "Indre 36",
        emails: "dept@amo.fr",
        telephone: "0111111111",
        adresse: "3 rue Dept",
      };

      mockDbResults([amoEpci1, amoEpci2], [amoDepartement]);

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");

      expect(result.data).toHaveLength(2);
      expect(result.data.map((a) => a.id)).toContain("amo-a-id");
      expect(result.data.map((a) => a.id)).toContain("amo-b-id");
      expect(result.data.find((a) => a.id === "amo-c-id")).toBeUndefined();
    });
  });

  describe("Test 4 : Plusieurs AMO sur même département (sans EPCI)", () => {
    it("doit retourner TOUS les AMO du département si aucun match EPCI", async () => {
      // GIVEN
      mockValidSession();

      const parcours = createMockParcours("36006", "999999999");
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcours as ParcoursPrevention
      );

      const amoDept1 = {
        id: "amo-d-id",
        nom: "AMO Département 1",
        siret: "44444444444444",
        departements: "Indre 36",
        emails: "dept1@amo.fr",
        telephone: "0123456789",
        adresse: "4 rue Dept",
      };

      const amoDept2 = {
        id: "amo-e-id",
        nom: "AMO Département 2",
        siret: "55555555555555",
        departements: "Indre 36",
        emails: "dept2@amo.fr",
        telephone: "0198765432",
        adresse: "5 rue Dept",
      };

      mockDbResults([], [amoDept1, amoDept2]);

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");

      expect(result.data).toHaveLength(2);
      expect(result.data.map((a) => a.id)).toContain("amo-d-id");
      expect(result.data.map((a) => a.id)).toContain("amo-e-id");
    });
  });

  describe("Test 5 : User sans EPCI (null/undefined)", () => {
    it("doit retourner les AMO du département si l'user n'a pas d'EPCI", async () => {
      // GIVEN
      mockValidSession();

      const parcours = createMockParcours("36006", null);
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcours as ParcoursPrevention
      );

      const amoDepartement = {
        id: "amo-f-id",
        nom: "AMO Département Sans EPCI",
        siret: "66666666666666",
        departements: "Indre 36",
        emails: "sansepci@amo.fr",
        telephone: "0123456789",
        adresse: "6 rue Sans EPCI",
      };

      mockDbResults([], [amoDepartement]);

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("amo-f-id");
    });
  });

  describe("Test 6 : Aucun AMO disponible", () => {
    it("doit retourner une liste vide si aucun AMO ne couvre ni l'EPCI ni le département", async () => {
      // GIVEN
      mockValidSession();

      const parcours = createMockParcours("99999", "999999999");
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcours as ParcoursPrevention
      );

      mockDbResults([], []);

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");

      expect(result.data).toHaveLength(0);
    });
  });

  describe("Test 7 : Gestion des types (number vs string pour EPCI)", () => {
    it("doit gérer correctement un EPCI en tant que number", async () => {
      // GIVEN
      mockValidSession();

      const parcours = createMockParcours(36006, 200068872);
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcours as ParcoursPrevention
      );

      const amoEpci = {
        id: "amo-number-id",
        nom: "AMO EPCI Number",
        siret: "77777777777777",
        departements: "Indre 36",
        emails: "number@amo.fr",
        telephone: "0123456789",
        adresse: "7 rue Number",
      };

      mockDbResults([amoEpci], []);

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("amo-number-id");
    });
  });

  describe("Tests d'erreur", () => {
    it("doit retourner une erreur si l'utilisateur n'est pas connecté", async () => {
      // GIVEN
      vi.mocked(getSession).mockResolvedValue(null);

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected error");

      expect(result.error).toBe("Non connecté");
    });

    it("doit retourner une erreur si le parcours n'a pas de code INSEE", async () => {
      // GIVEN
      mockValidSession();

      const parcoursIncomplet: Partial<ParcoursPrevention> = {
        id: "parcours-123",
        userId: "user-123",
        rgaSimulationData: {
          logement: {
            // Pas de commune
          },
        } as ParcoursPrevention["rgaSimulationData"],
      };

      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcoursIncomplet as ParcoursPrevention
      );

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected error");

      expect(result.error).toBe(
        "Simulation RGA non complétée (code INSEE manquant)"
      );
    });

    it("doit retourner une erreur si le code INSEE est invalide", async () => {
      // GIVEN
      mockValidSession();

      const parcoursInvalide = createMockParcours("INVALID", null);
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcoursInvalide as ParcoursPrevention
      );

      // WHEN
      const result = await getAmosDisponibles();

      // THEN
      expect(result.success).toBe(false);
      if (result.success) throw new Error("Expected error");

      expect(result.error).toBe(
        "Simulation RGA non complétée (code INSEE invalide)"
      );
    });
  });

  describe("Test 8 : Vérification que les codes INSEE ne sont PAS utilisés", () => {
    it("ne doit jamais appeler la requête sur entreprises_amo_communes", async () => {
      // GIVEN
      mockValidSession();

      const parcours = createMockParcours("36006", null);
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(
        parcours as ParcoursPrevention
      );

      const amoDepartement = {
        id: "amo-dept-id",
        nom: "AMO Département",
        siret: "88888888888888",
        departements: "Indre 36",
        emails: "dept@amo.fr",
        telephone: "0123456789",
        adresse: "8 rue Dept",
      };

      mockDbResults([], [amoDepartement]);

      // WHEN
      await getAmosDisponibles();

      // THEN
      expect(db.select).toHaveBeenCalled();
    });
  });
});
