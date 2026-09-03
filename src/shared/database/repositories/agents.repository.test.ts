import { describe, it, expect, beforeEach, vi } from "vitest";
import { AgentsRepository } from "./agents.repository";
import { db } from "../client";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("../client", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
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

/** Chaîne `db.select({...}).from(t).where(c)` — le `where` est directement awaité. */
function mockCountChain(counts: number[]) {
  const from = vi.fn().mockImplementation(() => ({
    where: vi.fn().mockResolvedValue([{ count: counts.shift() ?? 0 }]),
  }));
  return { from };
}

describe("AgentsRepository.countTraces", () => {
  let repo: AgentsRepository;

  beforeEach(() => {
    repo = new AgentsRepository();
    vi.clearAllMocks();
  });

  it("totalise les cinq sources d'historique", async () => {
    // Ordre : actions, qualifications, archivages, dossiers créés, simulations éditées.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue(mockCountChain([12, 3, 2, 5, 1]) as any);

    expect(await repo.countTraces("a-1")).toEqual({
      actions: 12,
      qualifications: 3,
      archivages: 2,
      dossiersCrees: 5,
      simulationsEditees: 1,
      total: 23,
    });
  });

  it("retourne un total nul pour un agent sans historique", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue(mockCountChain([0, 0, 0, 0, 0]) as any);

    expect((await repo.countTraces("a-2")).total).toBe(0);
  });
});

describe("AgentsRepository désactivation", () => {
  let repo: AgentsRepository;
  let set: ReturnType<typeof vi.fn>;

  function mockUpdateChain(returned: unknown[]) {
    const returning = vi.fn().mockResolvedValue(returned);
    const where = vi.fn().mockReturnValue({ returning });
    set = vi.fn().mockReturnValue({ where });
    return { set };
  }

  beforeEach(() => {
    repo = new AgentsRepository();
    vi.clearAllMocks();
  });

  it("horodate la désactivation avec son auteur et sa raison", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.update).mockReturnValue(mockUpdateChain([{ id: "a-1" }]) as any);

    const result = await repo.desactiver("a-1", "super-admin-1", "A quitté ses fonctions");

    expect(result).toEqual({ id: "a-1" });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        desactiveAt: expect.any(Date),
        desactivePar: "super-admin-1",
        desactiveRaison: "A quitté ses fonctions",
      })
    );
  });

  it("est un no-op sur un agent déjà désactivé (date d'origine préservée)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.update).mockReturnValue(mockUpdateChain([]) as any);

    expect(await repo.desactiver("a-1", "super-admin-1")).toBeNull();
  });

  it("remet les trois colonnes à null à la réactivation", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.update).mockReturnValue(mockUpdateChain([{ id: "a-1" }]) as any);

    await repo.reactiver("a-1");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ desactiveAt: null, desactivePar: null, desactiveRaison: null })
    );
  });
});
