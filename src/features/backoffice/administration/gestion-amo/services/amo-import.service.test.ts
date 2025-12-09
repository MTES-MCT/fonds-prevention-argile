import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { importAmosFromExcel } from "./amo-import.service";
import { db } from "@/shared/database/client";
import {
  entreprisesAmo,
  entreprisesAmoCommunes,
  entreprisesAmoEpci,
} from "@/shared/database/schema";

// Mock des dépendances
vi.mock("xlsx", () => ({
  default: {
    read: vi.fn(),
    utils: {
      sheet_to_json: vi.fn(),
    },
  },
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn(),
  },
}));

vi.mock("@/shared/database/client", () => ({
  db: {
    insert: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
  },
}));

describe("amo-import.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("importAmosFromExcel", () => {
    const createMockFile = (name: string, content: ArrayBuffer): File => {
      return {
        name,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        arrayBuffer: async () => content,
      } as File;
    };

    const createMockFormData = (file: File): FormData => {
      const formData = new FormData();
      formData.append("file", file);
      formData.get = vi.fn().mockReturnValue(file);
      return formData;
    };

    const mockWorkbook = {
      SheetNames: ["AMO"],
      Sheets: {
        AMO: {},
      },
    };

    // Helper pour mocker les requêtes DB
    const mockDbForInsert = (isUpdate: boolean = false) => {
      // Mock pour vérifier si l'AMO existe
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(isUpdate ? [{ id: "amo-1" }] : []),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Mock pour l'insert/upsert
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Mock pour delete
      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    };

    it("devrait échouer si aucun fichier n'est fourni", async () => {
      const formData = new FormData();

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Aucun fichier fourni");
    });

    it("devrait échouer si le fichier n'est pas au format Excel", async () => {
      const file = createMockFile("test.pdf", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Le fichier doit être au format Excel (.xlsx ou .xls)"
      );
    });

    it("devrait importer avec succès des données avec EPCI valides", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Paris",
          epci: "200054781;200058519",
          siret: "12345678901234",
          departements: "75, 77",
          emails: "contact@amo-paris.fr",
          telephone: "0123456789",
          adresse: "1 rue de Paris",
          codes_insee: "75001, 75002",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(validData);
      mockDbForInsert(false);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Import réussi");
      expect(result.stats?.entreprisesCreated).toBe(1);
      expect(result.stats?.entreprisesUpdated).toBe(0);
      expect(result.stats?.epciCreated).toBe(2);
      expect(result.stats?.communesCreated).toBe(2);
    });

    it("devrait valider les codes EPCI (9 chiffres uniquement)", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithInvalidEpci = [
        {
          nom: "AMO Test",
          epci: "200054781;12345;ABCDEFGHI;200058519",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithInvalidEpci);
      mockDbForInsert(false);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      // Seulement 2 EPCI valides sur 4
      expect(result.stats?.epciCreated).toBe(2);
    });

    it("devrait mettre à jour une AMO existante (UPSERT)", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Paris Updated",
          epci: "200054781",
          siret: "12345678901234", // Même SIRET = UPDATE
          departements: "75",
          emails: "new-contact@amo-paris.fr",
          telephone: "0198765432",
          adresse: "2 rue de Paris",
          codes_insee: "",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(validData);
      mockDbForInsert(true); // Simule une AMO existante

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(0);
      expect(result.stats?.entreprisesUpdated).toBe(1);
    });

    it("devrait supprimer les anciens EPCI avant d'insérer les nouveaux", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Test",
          epci: "200054781;200058519",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(validData);
      mockDbForInsert(true); // AMO existante

      await importAmosFromExcel(formData);

      // Vérifier que delete a été appelé pour EPCI
      expect(db.delete).toHaveBeenCalledWith(entreprisesAmoEpci);
    });

    it("devrait supprimer les anciens codes INSEE avant d'insérer les nouveaux", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Test",
          epci: "",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "75001,75002",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(validData);
      mockDbForInsert(true);

      await importAmosFromExcel(formData);

      // Vérifier que delete a été appelé pour communes
      expect(db.delete).toHaveBeenCalledWith(entreprisesAmoCommunes);
    });

    it("devrait fonctionner sans EPCI (optionnel)", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithoutEpci = [
        {
          nom: "AMO Test",
          epci: "",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithoutEpci);
      mockDbForInsert(false);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(1);
      expect(result.stats?.epciCreated).toBe(0);
    });

    it("devrait gérer un mix de création et mise à jour", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const mixedData = [
        {
          nom: "AMO New",
          epci: "200054781",
          siret: "11111111111111",
          departements: "75",
          emails: "new@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "",
        },
        {
          nom: "AMO Updated",
          epci: "200058519",
          siret: "22222222222222",
          departements: "77",
          emails: "updated@amo.fr",
          telephone: "0198765432",
          adresse: "2 rue",
          codes_insee: "",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mixedData);

      // Premier appel = nouvelle AMO, deuxième = AMO existante
      let callCount = 0;
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockImplementation(() => {
              callCount++;
              return Promise.resolve(callCount === 1 ? [] : [{ id: "amo-2" }]);
            }),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "amo-x" }]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      vi.mocked(db.delete).mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(1);
      expect(result.stats?.entreprisesUpdated).toBe(1);
      expect(result.message).toContain("créées/mises à jour");
    });

    it("devrait supprimer toutes les données si clearExisting=true", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Test",
          epci: "200054781",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(validData);
      mockDbForInsert(false);

      await importAmosFromExcel(formData, true);

      expect(db.delete).toHaveBeenCalledWith(entreprisesAmoEpci);
      expect(db.delete).toHaveBeenCalledWith(entreprisesAmoCommunes);
      expect(db.delete).toHaveBeenCalledWith(entreprisesAmo);
      // 3 deletes initiaux + 2 par AMO (EPCI + communes)
      expect(db.delete).toHaveBeenCalledTimes(5);
    });

    it("devrait continuer l'import même si certaines lignes échouent", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const mixedData = [
        {
          nom: "AMO Valid",
          epci: "200054781",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@valid.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "",
        },
        {
          nom: "AMO Invalid SIRET",
          epci: "",
          siret: "123", // invalide
          departements: "75",
          emails: "contact@invalid.fr",
          telephone: "0123456789",
          adresse: "2 rue",
          codes_insee: "",
        },
        {
          nom: "AMO Valid 2",
          epci: "200058519",
          siret: "98765432109876",
          departements: "77",
          emails: "contact@valid2.fr",
          telephone: "0123456789",
          adresse: "3 rue",
          codes_insee: "",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mixedData);
      mockDbForInsert(false);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(2);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some((e) => e.includes("SIRET invalide"))).toBe(
        true
      );
    });
  });
});
