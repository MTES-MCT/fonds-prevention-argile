import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AgentsRepository } from "./agents.repository";
import type { Agent, AgentLigne } from "../schema/agents";
import { db } from "../client";
import { structuresRepository } from "./structures.repository";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("../client", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

function mockSelectChain(row: unknown) {
  const limit = vi.fn().mockResolvedValue(row ? [row] : []);
  const where = vi.fn().mockReturnValue({ limit });
  const leftJoin3 = vi.fn().mockReturnValue({ where });
  const leftJoin2 = vi.fn().mockReturnValue({ leftJoin: leftJoin3 });
  const leftJoin1 = vi.fn().mockReturnValue({ leftJoin: leftJoin2 });
  const from = vi.fn().mockReturnValue({ leftJoin: leftJoin1 });
  return { from };
}

function ligneAgent(override: Partial<AgentLigne> = {}): AgentLigne {
  return {
    id: "a-1",
    sub: "sub-1",
    email: "jean.dupont@gouv.fr",
    givenName: "Jean",
    usualName: "Dupont",
    uid: null,
    siret: null,
    phone: null,
    organizationalUnit: null,
    structureId: null,
    legacyRole: UserRole.ADMINISTRATEUR,
    legacyEntrepriseAmoId: null,
    legacyAllersVersId: null,
    desactiveAt: null,
    desactivePar: null,
    desactiveRaison: null,
    lastLogin: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...override,
  };
}

function ligneResolue(agent: AgentLigne, habilitations: { amo?: boolean; av?: boolean } = {}) {
  return {
    agent,
    structureNom: agent.structureId ? "Soliha 54" : null,
    amoId: habilitations.amo ? "amo-1" : null,
    amoNom: habilitations.amo ? "Soliha 54" : null,
    amoSiret: habilitations.amo ? "12345678901234" : null,
    avId: habilitations.av ? "av-1" : null,
    avNom: habilitations.av ? "Soliha Meurthe-et-Moselle" : null,
  };
}

describe("AgentsRepository — rôle dérivé de la structure", () => {
  let repo: AgentsRepository;

  beforeEach(() => {
    repo = new AgentsRepository();
    vi.clearAllMocks();
  });

  function mockLigne(ligne: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockReturnValue(mockSelectChain(ligne) as any);
  }

  it("retourne null si l'agent n'existe pas", async () => {
    mockLigne(null);
    expect(await repo.findById("absent")).toBeNull();
  });

  it("donne les deux rôles d'une structure qui a ses deux habilitations", async () => {
    mockLigne(
      ligneResolue(ligneAgent({ structureId: "s-1", legacyRole: UserRole.ALLERS_VERS }), { amo: true, av: true })
    );

    const agent = await repo.findById("a-1");

    expect(agent?.role).toBe(UserRole.AMO_ET_ALLERS_VERS);
    expect(agent?.entrepriseAmoId).toBe("amo-1");
    expect(agent?.allersVersId).toBe("av-1");
  });

  it("ignore les colonnes héritées quand la structure les contredit", async () => {
    mockLigne(
      ligneResolue(
        ligneAgent({ structureId: "s-1", legacyRole: UserRole.AMO, legacyEntrepriseAmoId: "ancienne-amo" }),
        { av: true }
      )
    );

    const agent = await repo.findById("a-1");

    expect(agent?.role).toBe(UserRole.ALLERS_VERS);
    expect(agent?.entrepriseAmoId).toBeNull();
  });

  it("ne donne aucun rôle à un agent dont la structure n'a plus d'habilitation", async () => {
    mockLigne(ligneResolue(ligneAgent({ structureId: "s-1", legacyRole: UserRole.AMO })));

    expect((await repo.findById("a-1"))?.role).toBeNull();
  });

  it("ne donne aucun rôle à un rôle de structure sans structure", async () => {
    mockLigne(ligneResolue(ligneAgent({ legacyRole: UserRole.AMO_ET_ALLERS_VERS })));

    expect((await repo.findById("a-1"))?.role).toBeNull();
  });

  it("garde le rôle plateforme d'un agent sans structure", async () => {
    mockLigne(ligneResolue(ligneAgent({ legacyRole: UserRole.ANALYSTE })));

    expect((await repo.findById("a-1"))?.role).toBe(UserRole.ANALYSTE);
  });

  it("expose la structure et ses lignes pour l'affichage", async () => {
    mockLigne(ligneResolue(ligneAgent({ structureId: "s-1" }), { amo: true }));

    const agent = await repo.findByIdAvecStructure("a-1");

    expect(agent?.structure).toEqual({ id: "s-1", nom: "Soliha 54" });
    expect(agent?.entrepriseAmo).toEqual({ id: "amo-1", nom: "Soliha 54", siret: "12345678901234" });
    expect(agent?.allersVers).toBeNull();
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
    const relu = { id: "a-1" } as Agent;
    vi.spyOn(repo, "findById").mockResolvedValue(relu);

    const result = await repo.desactiver("a-1", "super-admin-1", "A quitté ses fonctions");

    expect(result).toBe(relu);
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
    vi.spyOn(repo, "findById").mockResolvedValue({ id: "a-1" } as Agent);

    await repo.reactiver("a-1");

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ desactiveAt: null, desactivePar: null, desactiveRaison: null })
    );
  });
});

describe("AgentsRepository.authenticateFromProConnect", () => {
  let repo: AgentsRepository;

  const proConnectData = {
    sub: "sub-1",
    email: "jean.dupont@gouv.fr",
    given_name: "Jean",
    usual_name: "Dupont",
  };

  function agentFixture(override: Partial<Agent> = {}): Agent {
    return {
      id: "a-1",
      sub: "sub-1",
      email: "jean.dupont@gouv.fr",
      givenName: "Jean",
      usualName: "Dupont",
      uid: null,
      siret: null,
      phone: null,
      organizationalUnit: null,
      structureId: "s-1",
      role: UserRole.AMO,
      entrepriseAmoId: "amo-1",
      allersVersId: null,
      desactiveAt: null,
      desactivePar: null,
      desactiveRaison: null,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...override,
    };
  }

  beforeEach(() => {
    repo = new AgentsRepository();
    vi.clearAllMocks();
  });

  it("refuse un agent désactivé trouvé par sub, sans écrire en base", async () => {
    const desactive = agentFixture({ desactiveAt: new Date("2026-09-01T10:00:00Z") });
    vi.spyOn(repo, "findBySub").mockResolvedValue(desactive);
    vi.spyOn(repo, "findByEmail").mockResolvedValue(null);

    expect(await repo.authenticateFromProConnect(proConnectData)).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("refuse un agent désactivé trouvé par email (sub encore pending_)", async () => {
    const desactive = agentFixture({ sub: "pending_1", desactiveAt: new Date("2026-09-01T10:00:00Z") });
    vi.spyOn(repo, "findBySub").mockResolvedValue(null);
    vi.spyOn(repo, "findByEmail").mockResolvedValue(desactive);

    expect(await repo.authenticateFromProConnect(proConnectData)).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("refuse un agent sans rôle (structure sans habilitation), sans écrire en base", async () => {
    vi.spyOn(repo, "findBySub").mockResolvedValue(agentFixture({ role: null }));
    vi.spyOn(repo, "findByEmail").mockResolvedValue(null);

    expect(await repo.authenticateFromProConnect(proConnectData)).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("refuse un agent sans rôle trouvé par email (première connexion), sans écrire en base", async () => {
    vi.spyOn(repo, "findBySub").mockResolvedValue(null);
    vi.spyOn(repo, "findByEmail").mockResolvedValue(agentFixture({ sub: "pending_1", role: null }));

    expect(await repo.authenticateFromProConnect(proConnectData)).toBeNull();
    expect(db.update).not.toHaveBeenCalled();
  });

  it("laisse passer un agent actif et le relit avec son rôle dérivé", async () => {
    const actif = agentFixture();
    vi.spyOn(repo, "findBySub").mockResolvedValue(actif);
    vi.spyOn(repo, "findById").mockResolvedValue(actif);
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(await repo.authenticateFromProConnect(proConnectData)).toEqual(actif);
  });
});

describe("AgentsRepository.create — rattachement à une structure sous verrou", () => {
  const ordre: string[] = [];
  const insert = vi.fn();
  const tx = { insert };
  const compteStructure = { type: "structure" as const, structureId: "s-1" };
  const nouvel = { sub: "pending_1", email: "marie.martin@soliha.fr", givenName: "Marie", compte: compteStructure };

  beforeEach(() => {
    vi.clearAllMocks();
    ordre.length = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(tx));
    insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(() => {
          ordre.push("insertion");
          return Promise.resolve([{ id: "a-1" }]);
        }),
      }),
    });
    vi.mocked(db.select).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockSelectChain(ligneResolue(ligneAgent({ structureId: "s-1" }), { amo: true })) as any
    );
    vi.spyOn(structuresRepository, "verrouiller").mockImplementation(async () => {
      ordre.push("verrou");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lit les habilitations sous verrou partagé, dans la transaction de l'insertion", async () => {
    vi.spyOn(structuresRepository, "findAvecHabilitations").mockImplementation(async () => {
      ordre.push("lecture");
      return {
        id: "s-1",
        type: "accompagnement" as const,
        nom: "Soliha 54",
        entrepriseAmo: { id: "amo-1", nom: "Soliha 54" },
        allersVers: null,
        expert: null,
      };
    });

    const agent = await new AgentsRepository().create(nouvel);

    expect(structuresRepository.verrouiller).toHaveBeenCalledWith("s-1", "partage", tx);
    expect(structuresRepository.findAvecHabilitations).toHaveBeenCalledWith("s-1", tx);
    expect(ordre).toEqual(["verrou", "lecture", "insertion"]);
    expect(agent.role).toBe(UserRole.AMO);
  });

  it("n'insère rien quand la structure a perdu ses habilitations pendant l'attente du verrou", async () => {
    vi.spyOn(structuresRepository, "findAvecHabilitations").mockResolvedValue({
      id: "s-1",
      type: "accompagnement" as const,
      nom: "Soliha 54",
      entrepriseAmo: null,
      allersVers: null,
      expert: null,
    });

    await expect(new AgentsRepository().create(nouvel)).rejects.toThrow("aucun rôle à transmettre");
    expect(insert).not.toHaveBeenCalled();
  });

  it("ne verrouille aucune structure pour un compte plateforme", async () => {
    await new AgentsRepository().create({ ...nouvel, compte: { type: "plateforme", role: UserRole.ANALYSTE } });

    expect(structuresRepository.verrouiller).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalled();
  });
});
