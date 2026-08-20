import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const groupBy = vi.fn();
let capturedWhere: SQL | undefined;
let innerJoinCallCount = 0;

vi.mock("@/shared/database/client", () => ({
  db: {
    select: () => {
      const where = (condition: SQL) => {
        capturedWhere = condition;
        return { groupBy };
      };
      const innerJoin = () => {
        innerJoinCallCount += 1;
        return { where };
      };
      return { from: () => ({ where, innerJoin }) };
    },
  },
}));

import { getActiviteStats } from "./activite.service";

const dialect = new PgDialect();

function compileWhere(): string {
  const { sql } = dialect.sqlToQuery(capturedWhere as SQL);
  return sql;
}

describe("getActiviteStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedWhere = undefined;
    innerJoinCallCount = 0;
  });

  it("agrège le nombre d'actions par type, trié par nombre décroissant, avec libellé connu", async () => {
    groupBy.mockResolvedValueOnce([
      { actionType: "commentaire_libre", count: 5 },
      { actionType: "appel_effectue", count: 10 },
    ]); // actionType, periode actuelle
    groupBy.mockResolvedValueOnce([]); // actionType, periode precedente
    groupBy.mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]); // demandeurs distincts, periode actuelle
    groupBy.mockResolvedValueOnce([]); // demandeurs distincts, periode precedente

    const stats = await getActiviteStats("30j");

    expect(stats.total.valeur).toBe(15);
    expect(stats.demandeursDistincts.valeur).toBe(2);
    expect(stats.parType).toHaveLength(2);
    expect(stats.parType[0]).toMatchObject({
      actionType: "appel_effectue",
      count: 10,
      pourcentage: 67,
    });
    expect(stats.parType[0].label).toContain("Appel effectué");
    expect(stats.parType[1]).toMatchObject({ actionType: "commentaire_libre", count: 5, pourcentage: 33 });
  });

  it("retombe sur la valeur brute comme libellé pour un type d'action inconnu", async () => {
    groupBy.mockResolvedValueOnce([{ actionType: "type_inconnu_xyz", count: 1 }]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([{ userId: "u1" }]);
    groupBy.mockResolvedValueOnce([]);

    const stats = await getActiviteStats("30j");

    expect(stats.parType[0]).toMatchObject({ actionType: "type_inconnu_xyz", label: "type_inconnu_xyz" });
  });

  it("calcule la variation par rapport à la période précédente de même durée", async () => {
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 20 }]); // periode actuelle
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 10 }]); // periode precedente
    groupBy.mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]); // demandeurs, actuelle
    groupBy.mockResolvedValueOnce([{ userId: "u1" }]); // demandeurs, precedente

    const stats = await getActiviteStats("30j");

    expect(stats.total.variation).toBe(100); // (20-10)/10 * 100
    expect(stats.parType[0].variation).toBe(100);
    expect(stats.demandeursDistincts.variation).toBe(100); // (2-1)/1 * 100
  });

  it('ne calcule pas de variation pour la période "Depuis le début" (pas de période précédente)', async () => {
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 20 }]);
    groupBy.mockResolvedValueOnce([{ userId: "u1" }]);

    const stats = await getActiviteStats("tout");

    expect(stats.total.variation).toBeNull();
    expect(stats.parType[0].variation).toBeNull();
    expect(stats.demandeursDistincts.variation).toBeNull();
    // Une seule requête par métrique (pas de periode precedente a calculer)
    expect(groupBy).toHaveBeenCalledTimes(2);
  });

  it("sans filtre département : ne joint pas parcours_prevention pour la répartition par type, mais joint pour les demandeurs distincts", async () => {
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);

    await getActiviteStats("30j");

    // 2 jointures attendues : demandeurs distincts (periode actuelle + precedente),
    // jamais pour la répartition par type sans filtre departement.
    expect(innerJoinCallCount).toBe(2);
  });

  it("avec filtre département : joint parcours_prevention et filtre sur le département", async () => {
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);

    await getActiviteStats("30j", "36");

    // 4 jointures : répartition par type (actuelle + precedente) + demandeurs distincts (actuelle + precedente)
    expect(innerJoinCallCount).toBe(4);
    const sql = compileWhere();
    expect(sql).toContain("code_departement");
    expect(sql).toContain('"parcours_actions"."created_at" >=');
  });
});
