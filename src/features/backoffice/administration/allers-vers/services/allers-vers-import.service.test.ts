import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";
import { importAllersVersFromExcel } from "./allers-vers-import.service";
import { allersVersRepository } from "@/shared/database/repositories";
import type { AllersVersWithRelations } from "@/shared/database/repositories/allers-vers.repository";

type MockRow = { eachCell: (cb: (cell: { value: unknown }, colNumber: number) => void) => void };

vi.mock("exceljs", () => {
  const mockWorkbook = { xlsx: { load: vi.fn() }, worksheets: [] as unknown[] };
  return {
    default: {
      Workbook: vi.fn(function () {
        return mockWorkbook;
      }),
    },
  };
});

vi.mock("@/shared/database/repositories", () => ({
  allersVersRepository: {
    findAllWithRelations: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateDepartementsRelations: vi.fn(),
    updateEpciRelations: vi.fn(),
    supprimerNonRattaches: vi.fn(),
  },
}));

const COLONNES = ["nom", "emails", "telephone", "adresse", "horaires", "departements", "epci"];

function setupFichier(lignes: Partial<Record<string, string>>[]) {
  const worksheet = {
    eachRow: (callback: (row: MockRow, rowNumber: number) => void) => {
      callback({ eachCell: (cb) => COLONNES.forEach((c, i) => cb({ value: c }, i + 1)) }, 1);
      lignes.forEach((ligne, index) => {
        callback({ eachCell: (cb) => COLONNES.forEach((c, i) => cb({ value: ligne[c] ?? "" }, i + 1)) }, index + 2);
      });
    },
  };
  (new ExcelJS.Workbook() as unknown as { worksheets: unknown[] }).worksheets = [worksheet];
}

function structureExistante(id: string, nom: string, departements: string[]): AllersVersWithRelations {
  return {
    id,
    nom,
    emails: ["contact@test.fr"],
    telephone: "",
    adresse: "",
    horaires: null,
    departements: departements.map((codeDepartement) => ({ codeDepartement })),
    epci: [],
  };
}

const ligneSoliha54 = { nom: "Soliha", emails: "contact@soliha54.fr", departements: "54" };

describe("importAllersVersFromExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(allersVersRepository.findAllWithRelations).mockResolvedValue([]);
    let compteur = 0;
    vi.mocked(allersVersRepository.create).mockImplementation(async (data) => ({
      id: `nouvelle-${++compteur}`,
      nom: data.nom ?? "",
      emails: data.emails ?? [],
      telephone: "",
      adresse: "",
      horaires: null,
    }));
  });

  it("met à jour une structure réimportée au lieu de la dupliquer", async () => {
    vi.mocked(allersVersRepository.findAllWithRelations).mockResolvedValue([
      structureExistante("av-24", "Soliha", ["24"]),
      structureExistante("av-54", "Soliha", ["54"]),
    ]);
    setupFichier([{ ...ligneSoliha54, nom: "SOLIHA", epci: "" }]);

    const result = await importAllersVersFromExcel(new ArrayBuffer(0));

    expect(result).toMatchObject({ success: true, created: 0, updated: 1 });
    expect(allersVersRepository.create).not.toHaveBeenCalled();
    expect(allersVersRepository.update).toHaveBeenCalledWith("av-54", expect.objectContaining({ nom: "SOLIHA" }));
    // Le fichier fait foi : un EPCI vidé dans le fichier est retiré en base
    expect(allersVersRepository.updateEpciRelations).toHaveBeenCalledWith("av-54", []);
  });

  it("crée un homonyme d'un autre département", async () => {
    vi.mocked(allersVersRepository.findAllWithRelations).mockResolvedValue([
      structureExistante("av-24", "Soliha", ["24"]),
    ]);
    setupFichier([ligneSoliha54]);

    const result = await importAllersVersFromExcel(new ArrayBuffer(0));

    expect(result).toMatchObject({ success: true, created: 1, updated: 0 });
    expect(allersVersRepository.update).not.toHaveBeenCalled();
  });

  it("ignore une ligne ambiguë sans rien écrire", async () => {
    vi.mocked(allersVersRepository.findAllWithRelations).mockResolvedValue([
      structureExistante("av-24", "Soliha", ["24"]),
      structureExistante("av-54", "Soliha", ["54"]),
    ]);
    setupFichier([{ ...ligneSoliha54, departements: "24, 54" }]);

    const result = await importAllersVersFromExcel(new ArrayBuffer(0));

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("plusieurs structures existantes");
    expect(allersVersRepository.create).not.toHaveBeenCalled();
    expect(allersVersRepository.update).not.toHaveBeenCalled();
  });

  it("signale un doublon interne au fichier au lieu de créer deux structures", async () => {
    setupFichier([ligneSoliha54, { ...ligneSoliha54, departements: "54, 57" }]);

    const result = await importAllersVersFromExcel(new ArrayBuffer(0));

    expect(result.created).toBe(1);
    expect(result.updated).toBe(0);
    expect(result.errors).toEqual([expect.stringContaining("même structure que la ligne 2")]);
    expect(allersVersRepository.create).toHaveBeenCalledTimes(1);
  });

  it("accepte la virgule et le point-virgule dans les colonnes à plusieurs valeurs", async () => {
    setupFichier([
      {
        nom: "Adil",
        emails: "a@adil.fr; b@adil.fr, c@adil.fr",
        departements: "Gers 32; 31",
        epci: "200054781, 200058519",
      },
    ]);

    await importAllersVersFromExcel(new ArrayBuffer(0));

    expect(allersVersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ emails: ["a@adil.fr", "b@adil.fr", "c@adil.fr"] })
    );
    expect(allersVersRepository.updateDepartementsRelations).toHaveBeenCalledWith("nouvelle-1", ["32", "31"]);
    expect(allersVersRepository.updateEpciRelations).toHaveBeenCalledWith("nouvelle-1", ["200054781", "200058519"]);
  });

  it("ne supprime que les structures non rattachées et nomme celles conservées", async () => {
    vi.mocked(allersVersRepository.supprimerNonRattaches).mockResolvedValue({
      supprimees: ["Alte"],
      conservees: ["Soliha"],
    });
    vi.mocked(allersVersRepository.findAllWithRelations).mockResolvedValue([
      structureExistante("av-54", "Soliha", ["54"]),
    ]);
    setupFichier([ligneSoliha54]);

    const result = await importAllersVersFromExcel(new ArrayBuffer(0), true);

    expect(allersVersRepository.supprimerNonRattaches).toHaveBeenCalledTimes(1);
    expect(result.purge).toContain("1 conservée car rattachées à un agent");
    expect(result.purge).toContain("Soliha");
    // La structure conservée est mise à jour, donc l'agent garde son rattachement
    expect(result).toMatchObject({ created: 0, updated: 1 });
  });

  it("ne purge rien sans clearExisting", async () => {
    setupFichier([ligneSoliha54]);

    const result = await importAllersVersFromExcel(new ArrayBuffer(0));

    expect(allersVersRepository.supprimerNonRattaches).not.toHaveBeenCalled();
    expect(result.purge).toBeUndefined();
  });
});
