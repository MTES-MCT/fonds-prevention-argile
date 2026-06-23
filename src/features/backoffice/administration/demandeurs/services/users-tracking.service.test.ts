import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock minimal de la chaîne Drizzle : on contrôle les lignes renvoyées par orderBy
// pour vérifier le filtrage territorial fait en JS dans le service.
const { rowsHolder } = vi.hoisted(() => ({ rowsHolder: { rows: [] as unknown[] } }));

vi.mock("@/shared/database/client", () => {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.leftJoin = () => chain;
  chain.where = () => chain;
  chain.orderBy = () => Promise.resolve(rowsHolder.rows);
  return { db: { select: () => chain } };
});

import { getUsersWithParcours } from "./users-tracking.service";

function row(userId: string, codeDepartement: string) {
  return {
    userId,
    parcoursId: `parcours-${userId}`,
    parcoursRgaSimulationData: { logement: { code_departement: codeDepartement } },
    parcoursRgaSimulationDataAgent: null,
  };
}

describe("getUsersWithParcours — filtrage territorial", () => {
  beforeEach(() => {
    rowsHolder.rows = [row("u-36", "36"), row("u-75", "75")];
  });

  it("ne renvoie que les demandeurs du département scopé (analyste départemental)", async () => {
    const users = await getUsersWithParcours({ departements: ["36"] });
    expect(users.map((u) => u.user.id)).toEqual(["u-36"]);
  });

  it("renvoie tous les demandeurs sans filtre (analyste national / admin)", async () => {
    const users = await getUsersWithParcours(null);
    expect(users.map((u) => u.user.id).sort()).toEqual(["u-36", "u-75"]);
  });

  it("ne renvoie rien si noAccess", async () => {
    const users = await getUsersWithParcours({ noAccess: true });
    expect(users).toEqual([]);
  });
});
