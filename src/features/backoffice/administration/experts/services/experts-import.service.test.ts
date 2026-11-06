import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";

vi.mock("@/shared/database/repositories/experts.repository", () => ({
  expertsRepository: { findIdBySiret: vi.fn(), findById: vi.fn(), creer: vi.fn(), mettreAJour: vi.fn() },
}));
vi.mock("@/shared/database/client", () => ({
  db: { transaction: vi.fn((fn: (tx: unknown) => unknown) => fn("tx")) },
}));

import { importerExperts } from "./experts-import.service";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";

// En-têtes du référencement DHUP, tels que dans le fichier transmis.
const ENTETES_DHUP = [
  "Société",
  "SIRET/SIREN",
  "départements d'intervention",
  "Contact",
  "adresse postale",
  "adresse mail",
  "n° téléphone",
];

async function classeur(entetes: string[], lignes: unknown[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Feuil1");
  ws.addRow(entetes);
  for (const ligne of lignes) ws.addRow(ligne);
  const buffer = await wb.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

describe("importerExperts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(expertsRepository.findIdBySiret).mockResolvedValue(null);
  });

  it("lit le fichier de la DHUP tel quel, en rétablissant les zéros qu'Excel retire", async () => {
    const contenu = await classeur(ENTETES_DHUP, [
      ["Géotech", 39248872200027, 3, "Camille Exemple", "1 rue X", "contact@exemple.fr", 612345678],
    ]);

    const bilan = await importerExperts(contenu);

    expect(bilan).toEqual({ crees: 1, misAJour: 0, lignesRefusees: [] });
    expect(expertsRepository.creer).toHaveBeenCalledWith(
      expect.objectContaining({
        nom: "Géotech",
        siret: "39248872200027",
        contactInterneNom: "Camille Exemple",
        departements: [{ code: "03", email: "contact@exemple.fr", telephone: "0612345678" }],
      }),
      "tx"
    );
  });

  it("refuse et signale la ligne au SIRET invalide ou au département inconnu", async () => {
    const contenu = await classeur(ENTETES_DHUP, [
      ["Valide", "39248872200027", "63"],
      ["Faute de frappe", "39248872200028", "63"],
      ["Mauvais département", "39248872200027", "63, 99"],
    ]);

    const bilan = await importerExperts(contenu);

    expect(bilan).toEqual({
      crees: 1,
      misAJour: 0,
      lignesRefusees: [
        { ligne: 3, motif: "SIRET invalide « 39248872200028 » (14 chiffres attendus)" },
        { ligne: 4, motif: "département inconnu : « 99 »" },
      ],
    });
  });

  it("réunit les lignes d'un même SIRET, chaque département avec son contact", async () => {
    const contenu = await classeur(ENTETES_DHUP, [
      ["Géotech", "39248872200027", "36", "", "", "indre@exemple.fr", "0200000000"],
      ["Géotech", "39248872200027", "18", "", "", "cher@exemple.fr", ""],
      ["Géotech", "39248872200027", "36", "", "", "doublon@exemple.fr", ""],
    ]);

    const bilan = await importerExperts(contenu);

    expect(bilan).toEqual({
      crees: 1,
      misAJour: 0,
      lignesRefusees: [{ ligne: 4, motif: "département 36 déjà déclaré pour ce SIRET" }],
    });
    expect(vi.mocked(expertsRepository.creer).mock.calls[0][0].departements).toEqual([
      { code: "36", email: "indre@exemple.fr", telephone: "0200000000" },
      { code: "18", email: "cher@exemple.fr", telephone: null },
    ]);
  });

  it("met à jour un expert existant sans effacer la date ni le contact interne absents du fichier", async () => {
    vi.mocked(expertsRepository.findIdBySiret).mockResolvedValue("existant");
    vi.mocked(expertsRepository.findById).mockResolvedValue({
      id: "existant",
      nom: "Ancien nom",
      siret: "39248872200027",
      dateValidationDhup: "2026-05-15",
      contactInterneNom: "Camille Interne",
      contactInterneEmail: "interne@exemple.fr",
      contactInterneTelephone: null,
      desactiveAt: null,
      desactiveParNom: null,
      desactiveRaison: null,
      departements: [],
    });
    const contenu = await classeur(ENTETES_DHUP, [["Nouveau nom", "39248872200027", "63"]]);

    const bilan = await importerExperts(contenu);

    expect(bilan).toEqual({ crees: 0, misAJour: 1, lignesRefusees: [] });
    expect(expertsRepository.mettreAJour).toHaveBeenCalledWith(
      "existant",
      expect.objectContaining({
        nom: "Nouveau nom",
        dateValidationDhup: "2026-05-15",
        contactInterneNom: "Camille Interne",
        contactInterneEmail: "interne@exemple.fr",
      }),
      "tx"
    );
  });

  it("refuse un fichier sans les colonnes obligatoires", async () => {
    const contenu = await classeur(["Nom", "Email"], [["Géotech", "a@exemple.fr"]]);
    expect(await importerExperts(contenu)).toEqual({
      erreur: "Colonnes manquantes : SIRET, Départements d'intervention",
    });
  });

  it("signale les lignes d'un groupe que la base refuse, sans arrêter les autres", async () => {
    vi.mocked(expertsRepository.creer).mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "23505" }));
    const contenu = await classeur(ENTETES_DHUP, [
      ["Premier", "39248872200027", "63"],
      ["Second", "12345678900007", "36"],
    ]);

    const bilan = await importerExperts(contenu);

    expect(bilan).toEqual({
      crees: 1,
      misAJour: 0,
      lignesRefusees: [{ ligne: 2, motif: "enregistrement impossible" }],
    });
  });
});
