import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/database/repositories/structures.repository", () => ({
  structuresRepository: {
    creer: vi.fn(),
    findIdBySiret: vi.fn(),
    findIdentite: vi.fn(),
    mettreAJourIdentite: vi.fn(),
    verrouiller: vi.fn(),
  },
}));
vi.mock("@/shared/database/repositories/agents.repository", () => ({
  agentsRepository: { compterParStructure: vi.fn() },
}));

import { rattacherStructure } from "./rattachement-import.service";
import { structuresRepository } from "@/shared/database/repositories/structures.repository";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";

const LIGNE = { nom: "Soliha 36", siret: "39248872200027", adresse: "1 rue", telephone: "", horaires: null };
const FICHE = { nom: "Soliha Indre", siret: "39248872200027", adresse: "", telephone: "0254000000", horaires: null };

describe("rattacherStructure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(structuresRepository.findIdBySiret).mockResolvedValue(null);
    vi.mocked(structuresRepository.creer).mockResolvedValue("neuve");
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(2);
  });

  it("crée une structure du type du rôle quand aucun SIRET de ce type ne correspond", async () => {
    expect(await rattacherStructure(LIGNE, "tx" as never, { type: "expert" })).toEqual({
      structureId: "neuve",
      creee: true,
      ecarts: [],
      remplacements: [],
      nombreAgents: 0,
    });
    expect(structuresRepository.findIdBySiret).toHaveBeenCalledWith(LIGNE.siret, "expert", "tx");
    expect(structuresRepository.creer).toHaveBeenCalledWith(LIGNE, "expert", "tx");
  });

  it("rejoint la structure du SIRET et n'en complète que les champs vides", async () => {
    vi.mocked(structuresRepository.findIdBySiret).mockResolvedValue("existante");
    vi.mocked(structuresRepository.findIdentite).mockResolvedValue(FICHE);

    const rattachement = await rattacherStructure(LIGNE, "tx" as never, { type: "accompagnement" });

    expect(rattachement).toMatchObject({ structureId: "existante", creee: false, ecarts: ["nom"], nombreAgents: 2 });
    expect(structuresRepository.verrouiller).toHaveBeenCalledWith("existante", "exclusif", "tx");
    expect(structuresRepository.mettreAJourIdentite).toHaveBeenCalledWith(
      "existante",
      { ...FICHE, adresse: "1 rue" },
      "tx"
    );
  });

  it("remplace les coordonnées sur demande", async () => {
    vi.mocked(structuresRepository.findIdBySiret).mockResolvedValue("existante");
    vi.mocked(structuresRepository.findIdentite).mockResolvedValue(FICHE);

    const rattachement = await rattacherStructure(LIGNE, "tx" as never, { type: "accompagnement", remplacer: true });

    expect(rattachement).toMatchObject({ ecarts: [], remplacements: ["nom"] });
    expect(structuresRepository.mettreAJourIdentite).toHaveBeenCalledWith(
      "existante",
      { ...FICHE, nom: "Soliha 36", adresse: "1 rue" },
      "tx"
    );
  });

  it("ne donne pas à la structure désignée un SIRET qu'une autre du même type porte déjà", async () => {
    vi.mocked(structuresRepository.findIdentite).mockResolvedValue({ ...FICHE, siret: null, adresse: "1 rue" });
    vi.mocked(structuresRepository.findIdBySiret).mockResolvedValue("autre");

    const rattachement = await rattacherStructure(LIGNE, "tx" as never, {
      type: "accompagnement",
      structureDesignee: "designee",
    });

    expect(rattachement.ecarts).toEqual(["nom", "SIRET"]);
    expect(structuresRepository.mettreAJourIdentite).not.toHaveBeenCalled();
  });
});
