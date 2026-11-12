import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../client";
import { structures } from "../schema";
import { EntreprisesAmoRepository } from "./entreprises-amo.repository";
import { structuresRepository } from "./structures.repository";
import { agentsRepository } from "./agents.repository";

vi.mock("../client", () => ({ db: { select: vi.fn(), transaction: vi.fn() } }));
vi.mock("./structures.repository", () => ({
  structuresRepository: { verrouiller: vi.fn(), findAvecHabilitations: vi.fn(), supprimerVides: vi.fn() },
}));
vi.mock("./agents.repository", () => ({
  agentsRepository: { compterParStructure: vi.fn(), resynchroniserColonnesHeritees: vi.fn() },
}));

const ordre: string[] = [];

// Structures lues pour la ligne : avant le verrou, puis après.
let lectures: string[] = [];

const tx = {
  select: vi.fn(() => ({
    from: () => ({ where: () => ({ limit: () => Promise.resolve([{ structureId: lectures.shift() ?? "s-1" }]) }) }),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(() => {
        ordre.push("suppression");
        return Promise.resolve([{ id: "amo-1", nom: "Soliha 54" }]);
      }),
    })),
  })),
};

function structureAvec(allersVers: boolean) {
  return {
    id: "s-1",
    nom: "Soliha 54",
    entrepriseAmo: { id: "amo-1", nom: "Soliha 54" },
    allersVers: allersVers ? { id: "av-1", nom: "Soliha 54" } : null,
  };
}

describe("EntreprisesAmoRepository.delete — un agent ne perd jamais son seul rôle", () => {
  let repo: EntreprisesAmoRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    ordre.length = 0;
    lectures = [];
    repo = new EntreprisesAmoRepository();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(tx));
    vi.mocked(structuresRepository.verrouiller).mockImplementation(async () => {
      ordre.push("verrou");
    });
  });

  it("refuse quand la structure n'a pas d'Aller-vers et emploie des agents, sans rien supprimer", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(false));
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(2);

    await expect(repo.delete("amo-1")).rejects.toThrow("perdraient leur seul rôle");
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("refuse quand une fusion ou un détachement a déplacé l'AMO avant le verrou", async () => {
    lectures = ["s-1", "s-2"];
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(true));

    await expect(repo.delete("amo-1")).rejects.toThrow("vient de changer de structure");
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("vérifie sous verrou exclusif, dans la transaction de la suppression", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockImplementation(async () => {
      ordre.push("lecture");
      return structureAvec(true);
    });
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(2);

    await repo.delete("amo-1");

    expect(structuresRepository.verrouiller).toHaveBeenCalledWith("s-1", "exclusif", tx);
    expect(structuresRepository.findAvecHabilitations).toHaveBeenCalledWith("s-1", tx);
    expect(ordre).toEqual(["verrou", "lecture", "suppression"]);
  });

  it("supprime l'habilitation AMO d'une structure qui garde son Aller-vers, et réaligne ses agents", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(true));
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(2);

    expect(await repo.delete("amo-1")).toBe(true);
    expect(agentsRepository.resynchroniserColonnesHeritees).toHaveBeenCalledWith("s-1", tx);
    expect(structuresRepository.supprimerVides).toHaveBeenCalledWith(tx);
  });

  it("supprime une AMO dont la structure n'emploie aucun agent", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(false));
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(0);

    expect(await repo.delete("amo-1")).toBe(true);
    expect(agentsRepository.compterParStructure).toHaveBeenCalledWith("s-1", tx);
  });
});

describe("EntreprisesAmoRepository.supprimerNonRattachees — purge sous verrou", () => {
  let verrou: ReturnType<typeof vi.fn>;
  let txPurge: { select: ReturnType<typeof vi.fn>; delete: typeof tx.delete };

  beforeEach(() => {
    vi.clearAllMocks();
    ordre.length = 0;
    verrou = vi.fn(() => {
      ordre.push("verrou");
      return Promise.resolve([{ id: "s-1" }]);
    });
    txPurge = {
      select: vi.fn(() => ({
        from: () => ({ innerJoin: () => ({ where: () => ({ orderBy: () => ({ for: verrou }) }) }) }),
      })),
      delete: tx.delete,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(txPurge));
    // Sous-requêtes de la purge, puis relecture des lignes conservées.
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({}), orderBy: () => Promise.resolve([{ nom: "Soliha 36" }]) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("verrouille les structures visées avant de supprimer, dans la même transaction", async () => {
    const bilan = await new EntreprisesAmoRepository().supprimerNonRattachees();

    expect(verrou).toHaveBeenCalledWith("update", { of: structures });
    expect(ordre).toEqual(["verrou", "suppression"]);
    expect(structuresRepository.supprimerVides).toHaveBeenCalledWith(txPurge);
    expect(bilan).toEqual({ supprimees: ["Soliha 54"], conservees: ["Soliha 36"] });
  });

  it("ne supprime rien quand aucune structure n'a été verrouillée", async () => {
    verrou.mockResolvedValue([]);

    const bilan = await new EntreprisesAmoRepository().supprimerNonRattachees();

    expect(tx.delete).not.toHaveBeenCalled();
    expect(bilan.supprimees).toEqual([]);
  });
});
