import { describe, it, expect, vi, beforeEach } from "vitest";
import ExcelJS from "exceljs";

vi.mock("@/shared/database/client", () => ({
  db: { transaction: vi.fn((fn: (tx: unknown) => unknown) => fn("tx")) },
}));
vi.mock("./rattachement-import.service", () => ({ rattacherStructure: vi.fn() }));
vi.mock("@/shared/database/repositories/structures.repository", () => ({
  structuresRepository: { findIdBySiret: vi.fn() },
}));
vi.mock("@/shared/database/repositories/agents.repository", () => ({
  agentsRepository: { resynchroniserColonnesHeritees: vi.fn() },
}));
vi.mock("@/shared/database/repositories/entreprises-amo.repository", () => ({
  entreprisesAmoRepository: {
    findHabilitationParStructure: vi.fn(),
    ajouter: vi.fn(async () => "amo-1"),
    mettreAJourHabilitation: vi.fn(),
    updateCommunesRelations: vi.fn(),
    updateEpciRelations: vi.fn(),
  },
}));
vi.mock("@/shared/database/repositories/allers-vers.repository", () => ({
  allersVersRepository: {
    findSansSiretPourRapprochement: vi.fn(),
    findHabilitationParStructure: vi.fn(),
    ajouter: vi.fn(async () => "av-1"),
    mettreAJourEmails: vi.fn(),
    updateDepartementsRelations: vi.fn(),
    updateEpciRelations: vi.fn(),
  },
}));
vi.mock("@/shared/database/repositories/experts.repository", () => ({
  expertsRepository: { findByStructure: vi.fn(), ajouter: vi.fn(), mettreAJour: vi.fn() },
}));

import { importerStructures, type OptionsImport } from "./import-structures.service";
import { rattacherStructure } from "./rattachement-import.service";
import { structuresRepository } from "@/shared/database/repositories/structures.repository";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import { entreprisesAmoRepository } from "@/shared/database/repositories/entreprises-amo.repository";
import { allersVersRepository } from "@/shared/database/repositories/allers-vers.repository";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";

const SIRET = "39248872200027";
const options = (role: OptionsImport["role"], autres: Partial<OptionsImport> = {}): OptionsImport => ({
  role,
  peutChangerRoles: true,
  remplacer: false,
  ...autres,
});

async function classeur(entetes: string[], lignes: unknown[][]): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Structures");
  ws.addRow(entetes);
  for (const ligne of lignes) ws.addRow(ligne);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

const FICHIER_AMO = () =>
  classeur(["nom", "siret", "departements", "emails"], [["Soliha Indre", SIRET, "Indre 36", "amo@s.fr"]]);
const FICHIER_AV = (siret = SIRET) =>
  classeur(["nom", "siret", "departements", "emails"], [["Espace conseil", siret, "36", "av@s.fr"]]);

function rattachement(valeurs: Partial<Awaited<ReturnType<typeof rattacherStructure>>> = {}) {
  vi.mocked(rattacherStructure).mockResolvedValue({
    structureId: "s-1",
    creee: true,
    ecarts: [],
    remplacements: [],
    nombreAgents: 0,
    ...valeurs,
  });
}

describe("importerStructures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    rattachement();
    vi.mocked(structuresRepository.findIdBySiret).mockResolvedValue(null);
    vi.mocked(allersVersRepository.findSansSiretPourRapprochement).mockResolvedValue([]);
    vi.mocked(allersVersRepository.findHabilitationParStructure).mockResolvedValue(null);
    vi.mocked(entreprisesAmoRepository.findHabilitationParStructure).mockResolvedValue(null);
    vi.mocked(expertsRepository.findByStructure).mockResolvedValue(null);
  });

  it("crée la structure d'accompagnement et son AMO, puis réaligne les rôles de ses agents", async () => {
    const bilan = await importerStructures(await FICHIER_AMO(), options("amo"));

    expect(rattacherStructure).toHaveBeenCalledWith(expect.objectContaining({ siret: SIRET }), "tx", {
      type: "accompagnement",
      structureDesignee: null,
      remplacer: false,
    });
    expect(entreprisesAmoRepository.ajouter).toHaveBeenCalledWith(
      "s-1",
      expect.objectContaining({ departements: "Indre 36", emails: "amo@s.fr" }),
      "tx"
    );
    expect(agentsRepository.resynchroniserColonnesHeritees).toHaveBeenCalledWith("s-1", "tx");
    expect(bilan).toEqual({
      structuresCreees: 1,
      structuresMisesAJour: 0,
      habilitationsAjoutees: 1,
      habilitationsMisesAJour: 0,
      lignesRefusees: [],
      avertissements: [],
    });
  });

  it("refuse sans super-administrateur de donner un rôle aux agents d'une structure, et signale les écarts", async () => {
    rattachement({ creee: false, nombreAgents: 3, ecarts: ["téléphone"] });

    const bilan = await importerStructures(await FICHIER_AV(), options("allersVers", { peutChangerRoles: false }));

    expect(allersVersRepository.ajouter).not.toHaveBeenCalled();
    expect(bilan).toMatchObject({
      structuresMisesAJour: 1,
      lignesRefusees: [
        {
          ligne: 2,
          motif: "la structure a des agents : seul un super-administrateur peut lui ajouter l'habilitation Aller-vers",
        },
      ],
      avertissements: ["Espace conseil : téléphone du fichier différent(s) de la fiche, non repris"],
    });
  });

  it("transmet la demande de remplacement et liste les champs remplacés", async () => {
    rattachement({ creee: false, remplacements: ["adresse"] });
    vi.mocked(entreprisesAmoRepository.findHabilitationParStructure).mockResolvedValue({
      id: "amo-existante",
      departements: "Indre 36",
      emails: "ancien@s.fr",
    });

    const bilan = await importerStructures(await FICHIER_AMO(), options("amo", { remplacer: true }));

    expect(rattacherStructure).toHaveBeenCalledWith(
      expect.anything(),
      "tx",
      expect.objectContaining({ remplacer: true })
    );
    expect(entreprisesAmoRepository.mettreAJourHabilitation).toHaveBeenCalledWith(
      "amo-existante",
      expect.objectContaining({ emails: "amo@s.fr" }),
      "tx"
    );
    expect(bilan).toMatchObject({
      habilitationsMisesAJour: 1,
      avertissements: ["Soliha Indre : adresse remplacé(s) par la valeur du fichier"],
    });
  });

  it("retrouve par son nom un Aller-vers encore sans SIRET, qui reçoit celui du fichier", async () => {
    vi.mocked(allersVersRepository.findSansSiretPourRapprochement).mockResolvedValue([
      { id: "av-36", nom: "Espace Conseil", structureId: "s-av", departements: ["36"] },
    ]);

    const bilan = await importerStructures(await FICHIER_AV(), options("allersVers"));

    expect(structuresRepository.findIdBySiret).toHaveBeenCalledWith(SIRET, "accompagnement");
    expect(rattacherStructure).toHaveBeenCalledWith(
      expect.anything(),
      "tx",
      expect.objectContaining({ structureDesignee: "s-av" })
    );
    expect(bilan).toMatchObject({
      avertissements: ["Espace conseil : rapproché par son nom de la structure existante, qui reçoit son SIRET"],
    });
  });

  it("lit le fichier de la DHUP tel quel, dans une structure expert", async () => {
    const dhup = await classeur(
      ["Société", "SIRET/SIREN", "départements d'intervention", "Contact", "adresse mail", "n° téléphone"],
      [["Géotech", Number(SIRET), 3, "Camille", "contact@g.fr", 612345678]]
    );

    await importerStructures(dhup, options("expert"));

    expect(allersVersRepository.findSansSiretPourRapprochement).not.toHaveBeenCalled();
    expect(rattacherStructure).toHaveBeenCalledWith(
      expect.anything(),
      "tx",
      expect.objectContaining({ type: "expert" })
    );
    expect(expertsRepository.ajouter).toHaveBeenCalledWith(
      "s-1",
      expect.objectContaining({
        contactInterneNom: "Camille",
        departements: [{ code: "03", email: "contact@g.fr", telephone: "0612345678" }],
      }),
      "tx"
    );
  });

  it("refuse un fichier sans SIRET, et signale un échec d'enregistrement sans arrêter les autres", async () => {
    expect(await importerStructures(await classeur(["nom", "emails"], [["A", "a@b.fr"]]), options("amo"))).toEqual({
      erreur: "Colonne SIRET introuvable : partez du modèle de ce rôle",
    });

    vi.mocked(rattacherStructure).mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "23505" }));
    const bilan = await importerStructures(
      await classeur(
        ["nom", "siret", "departements", "emails"],
        [
          ["Première", SIRET, "Indre 36", "a@b.fr"],
          ["Seconde", "12345678901234", "Cher 18", "c@d.fr"],
        ]
      ),
      options("amo")
    );
    expect(bilan).toMatchObject({
      structuresCreees: 1,
      lignesRefusees: [{ ligne: 2, motif: "enregistrement impossible" }],
    });
  });
});
