import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../client";
import { AllersVersRepository } from "./allers-vers.repository";
import { structuresRepository } from "./structures.repository";
import { agentsRepository } from "./agents.repository";

vi.mock("../client", () => ({ db: { select: vi.fn(), transaction: vi.fn() } }));
vi.mock("./structures.repository", () => ({
  structuresRepository: { verrouiller: vi.fn(), findAvecHabilitations: vi.fn() },
}));
vi.mock("./agents.repository", () => ({
  agentsRepository: { compterParStructure: vi.fn(), resynchroniserColonnesHeritees: vi.fn() },
}));

const ordre: string[] = [];

// Structure lue pour la ligne avant le verrou.
let lectures: string[] = [];

const tx = {
  select: vi.fn(() => ({
    from: () => ({ where: () => ({ limit: () => Promise.resolve([{ structureId: lectures.shift() ?? "s-1" }]) }) }),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(() => {
        ordre.push("suppression");
        return Promise.resolve([{ id: "av-1", nom: "Adil 32" }]);
      }),
    })),
  })),
};

function structureAvec(amo: boolean) {
  return {
    id: "s-1",
    type: "accompagnement" as const,
    nom: "Adil 32",
    entrepriseAmo: amo ? { id: "amo-1", nom: "Adil 32" } : null,
    allersVers: { id: "av-1", nom: "Adil 32" },
    expert: null,
  };
}

describe("AllersVersRepository.delete — un agent ne perd jamais son seul rôle", () => {
  let repo: AllersVersRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    ordre.length = 0;
    lectures = [];
    repo = new AllersVersRepository();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(tx));
    vi.mocked(structuresRepository.verrouiller).mockImplementation(async () => {
      ordre.push("verrou");
    });
  });

  it("refuse quand la structure n'a pas d'AMO et emploie des agents, sans rien supprimer", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(false));
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(1);

    await expect(repo.delete("av-1")).rejects.toThrow("perdraient leur seul rôle");
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("vérifie sous verrou exclusif, dans la transaction de la suppression", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockImplementation(async () => {
      ordre.push("lecture");
      return structureAvec(true);
    });
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(1);

    await repo.delete("av-1");

    expect(structuresRepository.verrouiller).toHaveBeenCalledWith("s-1", "exclusif", tx);
    expect(agentsRepository.compterParStructure).not.toHaveBeenCalled();
    expect(ordre).toEqual(["verrou", "lecture", "suppression"]);
  });

  it("supprime l'habilitation Aller-vers d'une structure qui garde son AMO, et réaligne ses agents", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(true));
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(1);

    expect(await repo.delete("av-1")).toBe(true);
    expect(structuresRepository.findAvecHabilitations).toHaveBeenCalledWith("s-1", tx);
    expect(agentsRepository.resynchroniserColonnesHeritees).toHaveBeenCalledWith("s-1", tx);
  });
});
