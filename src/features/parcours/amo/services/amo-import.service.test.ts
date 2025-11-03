import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { importAmosFromExcel } from "./amo-import.service";
import { db } from "@/shared/database/client";
import {
  entreprisesAmo,
  entreprisesAmoCommunes,
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

    it("devrait accepter les fichiers .xlsx", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Le fichier Excel est vide");
    });

    it("devrait accepter les fichiers .xls", async () => {
      const file = createMockFile("test.xls", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Le fichier Excel est vide");
    });

    it("devrait échouer si le fichier Excel est vide", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([]);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(false);
      expect(result.message).toBe("Le fichier Excel est vide");
    });

    it("devrait échouer si des colonnes obligatoires sont manquantes", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue([
        {
          nom: "AMO Test",
          siret: "12345678901234",
          // Manque : departements, emails, telephone, adresse
        },
      ]);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(false);
      expect(result.message).toContain("Colonnes manquantes");
      expect(result.message).toContain("departements");
      expect(result.message).toContain("emails");
      expect(result.message).toContain("telephone");
      expect(result.message).toContain("adresse");
    });

    it("devrait importer avec succès des données valides", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Paris",
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

      const mockEntreprise = { id: "amo-1" };

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockEntreprise]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain("Import réussi");
      expect(result.stats?.entreprisesCreated).toBe(1);
      expect(result.stats?.communesCreated).toBe(2);
    });

    it("devrait ignorer les lignes sans nom", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithEmptyName = [
        {
          nom: "",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithEmptyName);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(0);
      expect(result.errors).toContain("Ligne ignorée : nom manquant");
    });

    it("devrait rejeter un SIRET invalide (pas 14 chiffres)", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithInvalidSiret = [
        {
          nom: "AMO Test",
          siret: "123",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithInvalidSiret);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(0);
      expect(result.errors?.some((e) => e.includes("SIRET invalide"))).toBe(
        true
      );
    });

    it("devrait accepter un SIRET avec 14 chiffres", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(validData);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(1);
    });

    it("devrait rejeter si les emails sont manquants", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithoutEmails = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithoutEmails);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(0);
      expect(result.errors?.some((e) => e.includes("emails manquants"))).toBe(
        true
      );
    });

    it("devrait valider les emails et ignorer les invalides", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithInvalidEmails = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "invalid-email; contact@valid.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        dataWithInvalidEmails
      );

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(1);

      // Vérifier que seul l'email valide a été gardé
      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall.value.values).toHaveBeenCalledWith(
        expect.objectContaining({
          emails: "contact@valid.fr",
        })
      );
    });

    it("devrait rejeter si aucun email valide n'est trouvé", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithNoValidEmails = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "invalid; no-at-sign",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        dataWithNoValidEmails
      );

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(0);
      expect(
        result.errors?.some((e) => e.includes("aucun email valide trouvé"))
      ).toBe(true);
    });

    it("devrait gérer plusieurs emails valides séparés par des points-virgules", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithMultipleEmails = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact1@amo.fr; contact2@amo.fr; contact3@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        dataWithMultipleEmails
      );

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall.value.values).toHaveBeenCalledWith(
        expect.objectContaining({
          emails: "contact1@amo.fr;contact2@amo.fr;contact3@amo.fr",
        })
      );
    });

    it("devrait rejeter si les départements sont manquants", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithoutDept = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithoutDept);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(0);
      expect(
        result.errors?.some((e) => e.includes("départements manquants"))
      ).toBe(true);
    });

    it("devrait formater correctement les départements séparés par des virgules", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithMultipleDepts = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75, 77, 78",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        dataWithMultipleDepts
      );

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await importAmosFromExcel(formData);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall.value.values).toHaveBeenCalledWith(
        expect.objectContaining({
          departements: "75, 77, 78",
        })
      );
    });

    it("devrait formater un numéro de téléphone à 9 chiffres en ajoutant un 0", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithPhone9Digits = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithPhone9Digits);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await importAmosFromExcel(formData);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall.value.values).toHaveBeenCalledWith(
        expect.objectContaining({
          telephone: "0123456789",
        })
      );
    });

    it("devrait conserver un numéro de téléphone à 10 chiffres tel quel", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithPhone10Digits = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        dataWithPhone10Digits
      );

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await importAmosFromExcel(formData);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall.value.values).toHaveBeenCalledWith(
        expect.objectContaining({
          telephone: "0123456789",
        })
      );
    });

    it("devrait importer les codes INSEE valides (5 chiffres)", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithCodesInsee = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "75001, 75002, 75003",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithCodesInsee);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.communesCreated).toBe(3);
    });

    it("devrait ignorer les codes INSEE invalides (pas 5 chiffres)", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithInvalidCodesInsee = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "750, 75001, ABC12",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        dataWithInvalidCodesInsee
      );

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      // Seul 75001 est valide
      expect(result.stats?.communesCreated).toBe(1);
    });

    it("devrait fonctionner sans codes INSEE (optionnel)", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithoutCodesInsee = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
          codes_insee: "",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(
        dataWithoutCodesInsee
      );

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(1);
      expect(result.stats?.communesCreated).toBe(0);
    });

    it("devrait supprimer les données existantes si clearExisting=true", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(validData);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await importAmosFromExcel(formData, true);

      expect(db.delete).toHaveBeenCalledWith(entreprisesAmoCommunes);
      expect(db.delete).toHaveBeenCalledWith(entreprisesAmo);
      expect(db.delete).toHaveBeenCalledTimes(2);
    });

    it("ne devrait pas supprimer les données existantes si clearExisting=false", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const validData = [
        {
          nom: "AMO Test",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@amo.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(validData);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await importAmosFromExcel(formData, false);

      expect(db.delete).not.toHaveBeenCalled();
    });

    it("devrait continuer l'import même si certaines lignes échouent", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const mixedData = [
        {
          nom: "AMO Valid",
          siret: "12345678901234",
          departements: "75",
          emails: "contact@valid.fr",
          telephone: "0123456789",
          adresse: "1 rue",
        },
        {
          nom: "AMO Invalid SIRET",
          siret: "123", // invalide
          departements: "75",
          emails: "contact@invalid.fr",
          telephone: "0123456789",
          adresse: "2 rue",
        },
        {
          nom: "AMO Valid 2",
          siret: "98765432109876",
          departements: "77",
          emails: "contact@valid2.fr",
          telephone: "0123456789",
          adresse: "3 rue",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(mixedData);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const result = await importAmosFromExcel(formData);

      expect(result.success).toBe(true);
      expect(result.stats?.entreprisesCreated).toBe(2); // 2 valides sur 3
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it("devrait trimmer les espaces dans toutes les données", async () => {
      const file = createMockFile("test.xlsx", new ArrayBuffer(0));
      const formData = createMockFormData(file);

      const dataWithSpaces = [
        {
          nom: "  AMO Test  ",
          siret: "  12345678901234  ",
          departements: "  75  ",
          emails: "  contact@amo.fr  ",
          telephone: "  0123456789  ",
          adresse: "  1 rue  ",
        },
      ];

      vi.mocked(XLSX.read).mockReturnValue(mockWorkbook);
      vi.mocked(XLSX.utils.sheet_to_json).mockReturnValue(dataWithSpaces);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await importAmosFromExcel(formData);

      const insertCall = vi.mocked(db.insert).mock.results[0];
      expect(insertCall.value.values).toHaveBeenCalledWith(
        expect.objectContaining({
          nom: "AMO Test",
          siret: "12345678901234",
          adresse: "1 rue",
        })
      );
    });
  });
});
