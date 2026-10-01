import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAmosDisponibles, getAllAmos } from "./amo-disponibles.actions";
import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { db } from "@/shared/database/client";
import type { ParcoursPrevention } from "@/shared/database/schema";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { listerAmosDuTerritoire } from "../services/amo-couverture.service";

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

vi.mock("../services/amo-couverture.service", () => ({
  listerAmosDuTerritoire: vi.fn(),
}));

// La règle des niveaux (commune > EPCI > département) est testée dans `couverture-amo.test.ts` :
// l'action n'a plus qu'à lui transmettre le bon territoire.
describe("getAmosDisponibles", () => {
  const simulation = (commune: unknown, epci: unknown) =>
    ({ logement: { commune, epci } }) as unknown as ParcoursPrevention["rgaSimulationData"];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getSession).mockResolvedValue({ userId: "user-123", role: "user" } as Awaited<
      ReturnType<typeof getSession>
    >);
    vi.mocked(listerAmosDuTerritoire).mockResolvedValue([]);
  });

  it("refuse sans session", async () => {
    vi.mocked(getSession).mockResolvedValue(null);
    expect(await getAmosDisponibles()).toEqual({ success: false, error: "Non connecté" });
    expect(listerAmosDuTerritoire).not.toHaveBeenCalled();
  });

  it("transmet le territoire du demandeur, EPCI numérique compris", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({
      rgaSimulationData: simulation("59597", 200068500),
      rgaSimulationDataAgent: null,
    } as ParcoursPrevention);

    await getAmosDisponibles();

    expect(listerAmosDuTerritoire).toHaveBeenCalledWith({ codeInsee: "59597", codeEpci: "200068500" });
  });

  it("se rabat sur la simulation de l'agent quand le demandeur n'a pas simulé", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({
      rgaSimulationData: null,
      rgaSimulationDataAgent: simulation("59597", null),
    } as ParcoursPrevention);

    await getAmosDisponibles();

    expect(listerAmosDuTerritoire).toHaveBeenCalledWith({ codeInsee: "59597", codeEpci: null });
  });

  it("renvoie la liste telle que la couverture l'ordonne", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({
      rgaSimulationData: simulation("59597", "200068500"),
      rgaSimulationDataAgent: null,
    } as ParcoursPrevention);
    const amos = [
      { id: "a", nom: "Argiles du Nord", siret: "", departements: "", emails: "", telephone: "", adresse: "" },
      { id: "b", nom: "Habitat Cambrésis", siret: "", departements: "", emails: "", telephone: "", adresse: "" },
    ];
    vi.mocked(listerAmosDuTerritoire).mockResolvedValue(amos);

    expect(await getAmosDisponibles()).toEqual({ success: true, data: amos });
  });

  it.each([
    ["sans simulation", { rgaSimulationData: null, rgaSimulationDataAgent: null }],
    ["avec un code INSEE invalide", { rgaSimulationData: simulation("ABC", null), rgaSimulationDataAgent: null }],
  ])("refuse %s", async (_cas, parcours) => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours as ParcoursPrevention);

    expect(await getAmosDisponibles()).toEqual({
      success: false,
      error: "Simulation RGA non complétée (code INSEE manquant)",
    });
    expect(listerAmosDuTerritoire).not.toHaveBeenCalled();
  });
});

describe("getAllAmos - Restriction accès administrateurs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper pour mocker les résultats de la requête getAllAmos
  const mockGetAllAmosDbResults = (results: unknown[]) => {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(results),
          }),
        }),
      }),
    } as unknown as ReturnType<typeof db.select>);
  };

  describe("Accès autorisé pour les administrateurs", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "admin-123",
        role: UserRole.SUPER_ADMINISTRATEUR,
      } as Awaited<ReturnType<typeof getSession>>);

      mockGetAllAmosDbResults([]);

      const result = await getAllAmos();

      expect(result.success).toBe(true);
    });

    it("devrait autoriser l'accès pour ADMINISTRATEUR", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "admin-123",
        role: UserRole.ADMINISTRATEUR,
      } as Awaited<ReturnType<typeof getSession>>);

      mockGetAllAmosDbResults([]);

      const result = await getAllAmos();

      expect(result.success).toBe(true);
    });
  });

  describe("Accès refusé pour les non-administrateurs", () => {
    it("devrait refuser l'accès pour AMO", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "amo-123",
        role: UserRole.AMO,
      } as Awaited<ReturnType<typeof getSession>>);

      const result = await getAllAmos();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur lors de la récupération des AMO");
      }
    });

    it("devrait refuser l'accès pour ANALYSTE", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "analyste-123",
        role: UserRole.ANALYSTE,
      } as Awaited<ReturnType<typeof getSession>>);

      const result = await getAllAmos();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur lors de la récupération des AMO");
      }
    });

    it("devrait refuser l'accès pour PARTICULIER", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "particulier-123",
        role: UserRole.PARTICULIER,
      } as Awaited<ReturnType<typeof getSession>>);

      const result = await getAllAmos();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur lors de la récupération des AMO");
      }
    });

    it("devrait refuser l'accès si non connecté", async () => {
      vi.mocked(getSession).mockResolvedValue(null);

      const result = await getAllAmos();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur lors de la récupération des AMO");
      }
    });
  });

  describe("Retour des données pour les administrateurs", () => {
    it("devrait retourner la liste des AMO avec leurs relations", async () => {
      vi.mocked(getSession).mockResolvedValue({
        userId: "admin-123",
        role: UserRole.SUPER_ADMINISTRATEUR,
      } as Awaited<ReturnType<typeof getSession>>);

      const mockAmoData = [
        {
          id: "amo-1",
          nom: "AMO Test 1",
          siret: "11111111111111",
          departements: "Paris 75",
          emails: "test1@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue Test",
          codeInsee: "75001",
          codeEpci: "200054781",
        },
        {
          id: "amo-1",
          nom: "AMO Test 1",
          siret: "11111111111111",
          departements: "Paris 75",
          emails: "test1@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue Test",
          codeInsee: "75002",
          codeEpci: null,
        },
      ];

      mockGetAllAmosDbResults(mockAmoData);

      const result = await getAllAmos();

      expect(result.success).toBe(true);
      if (!result.success) throw new Error("Expected success");

      // Les données sont groupées par AMO
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe("amo-1");
      expect(result.data[0].communes).toHaveLength(2);
    });
  });
});
