import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentsRepository } from "./agents.repository";
import { db } from "../client";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("../client", () => ({
  db: {
    select: vi.fn(),
  },
}));

function mockSelectChain(row: unknown) {
  const limit = vi.fn().mockResolvedValue(row ? [row] : []);
  const where = vi.fn().mockReturnValue({ limit });
  const leftJoin2 = vi.fn().mockReturnValue({ where });
  const leftJoin1 = vi.fn().mockReturnValue({ leftJoin: leftJoin2 });
  const from = vi.fn().mockReturnValue({ leftJoin: leftJoin1 });
  return { from };
}

describe("AgentsRepository.findByIdWithStructure", () => {
  let repo: AgentsRepository;

  beforeEach(() => {
    repo = new AgentsRepository();
    vi.clearAllMocks();
  });

  it("retourne null si l'agent n'existe pas", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue(mockSelectChain(null) as any);
    expect(await repo.findByIdWithStructure("missing")).toBeNull();
  });

  it("résout entrepriseAmo si l'agent est rattaché à une AMO", async () => {
    vi.mocked(db.select).mockReturnValue(
      mockSelectChain({
        id: "a-1",
        givenName: "Jean",
        usualName: "Dupont",
        role: UserRole.AMO,
        amoId: "amo-1",
        amoNom: "Soliha 36",
        avId: null,
        avNom: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );

    const result = await repo.findByIdWithStructure("a-1");

    expect(result).toEqual({
      id: "a-1",
      givenName: "Jean",
      usualName: "Dupont",
      role: UserRole.AMO,
      entrepriseAmo: { id: "amo-1", nom: "Soliha 36" },
      allersVers: null,
    });
  });

  it("résout allersVers si l'agent est rattaché à un AV pur", async () => {
    vi.mocked(db.select).mockReturnValue(
      mockSelectChain({
        id: "a-2",
        givenName: "Élise",
        usualName: null,
        role: UserRole.ALLERS_VERS,
        amoId: null,
        amoNom: null,
        avId: "av-1",
        avNom: "Adil 36",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );

    const result = await repo.findByIdWithStructure("a-2");

    expect(result?.entrepriseAmo).toBeNull();
    expect(result?.allersVers).toEqual({ id: "av-1", nom: "Adil 36" });
  });

  it("retourne les deux structures nulles si l'agent n'a aucun rattachement", async () => {
    vi.mocked(db.select).mockReturnValue(
      mockSelectChain({
        id: "a-3",
        givenName: "Sam",
        usualName: "B.",
        role: UserRole.SUPER_ADMINISTRATEUR,
        amoId: null,
        amoNom: null,
        avId: null,
        avNom: null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );

    const result = await repo.findByIdWithStructure("a-3");

    expect(result?.entrepriseAmo).toBeNull();
    expect(result?.allersVers).toBeNull();
  });
});
