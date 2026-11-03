import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../client";
import { EntreprisesAmoRepository } from "./entreprises-amo.repository";
import { structuresRepository } from "./structures.repository";
import { agentsRepository } from "./agents.repository";

vi.mock("../client", () => ({ db: { select: vi.fn(), transaction: vi.fn() } }));
vi.mock("./structures.repository", () => ({
  structuresRepository: { findAvecHabilitations: vi.fn(), supprimerVides: vi.fn() },
}));
vi.mock("./agents.repository", () => ({
  agentsRepository: { compterParStructure: vi.fn(), resynchroniserColonnesHeritees: vi.fn() },
}));

const tx = {
  delete: vi.fn(() => ({ where: vi.fn(() => ({ returning: vi.fn().mockResolvedValue([{ id: "amo-1" }]) })) })),
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
    repo = new EntreprisesAmoRepository();
    vi.mocked(db.select).mockReturnValue({
      from: () => ({ where: () => ({ limit: () => Promise.resolve([{ structureId: "s-1" }]) }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(tx));
  });

  it("refuse quand la structure n'a pas d'Aller-vers et emploie des agents, sans rien supprimer", async () => {
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAvec(false));
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(2);

    await expect(repo.delete("amo-1")).rejects.toThrow("perdraient leur seul rôle");
    expect(db.transaction).not.toHaveBeenCalled();
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
  });
});
