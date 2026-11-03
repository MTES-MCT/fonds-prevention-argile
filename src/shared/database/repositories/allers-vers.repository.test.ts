import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../client";
import { AllersVersRepository } from "./allers-vers.repository";
import { structuresRepository } from "./structures.repository";
import { agentsRepository } from "./agents.repository";

vi.mock("../client", () => ({ db: { transaction: vi.fn() } }));
vi.mock("./structures.repository", () => ({
  structuresRepository: { findAvecHabilitations: vi.fn(), supprimerVides: vi.fn() },
}));
vi.mock("./agents.repository", () => ({
  agentsRepository: { compterParStructure: vi.fn(), resynchroniserColonnesHeritees: vi.fn() },
}));

const tx = {
  delete: vi.fn(() => ({
    where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "av-1" }]) })),
  })),
};

function structureAvec(amo: boolean) {
  return {
    id: "s-1",
    nom: "Adil 32",
    entrepriseAmo: amo ? { id: "amo-1", nom: "Adil 32" } : null,
    allersVers: { id: "av-1", nom: "Adil 32" },
  };
}

describe("AllersVersRepository.delete — un agent ne perd jamais son seul rôle", () => {
  let repo: AllersVersRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AllersVersRepository();
    vi.spyOn(repo, "findById").mockResolvedValue({
      id: "av-1",
      nom: "Adil 32",
      emails: [],
      telephone: "",
      adresse: "",
      horaires: null,
      structureId: "s-1",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(tx));
  });

  it("refuse quand la structure n'a pas d'AMO et emploie des agents, sans rien supprimer", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(false));
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(1);

    await expect(repo.delete("av-1")).rejects.toThrow("perdraient leur seul rôle");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("supprime l'habilitation Aller-vers d'une structure qui garde son AMO, et réaligne ses agents", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(true));
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(1);

    expect(await repo.delete("av-1")).toBe(true);
    expect(agentsRepository.resynchroniserColonnesHeritees).toHaveBeenCalledWith("s-1", tx);
    expect(structuresRepository.supprimerVides).toHaveBeenCalledWith(tx);
  });
});
