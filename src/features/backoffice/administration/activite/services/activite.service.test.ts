import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const groupBy = vi.fn();
let capturedWheres: SQL[] = [];
let innerJoinCallCount = 0;

vi.mock("@/shared/database/client", () => ({
  db: {
    select: () => {
      const where = (condition: SQL) => {
        capturedWheres.push(condition);
        return { groupBy };
      };
      const innerJoin = () => {
        innerJoinCallCount += 1;
        return { where, innerJoin };
      };
      return { from: () => ({ where, innerJoin }) };
    },
  },
}));

import { getActiviteStats } from "./activite.service";

const dialect = new PgDialect();

function compileAllWheres(): string {
  return capturedWheres.map((w) => dialect.sqlToQuery(w).sql).join(" | ");
}

describe("getActiviteStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedWheres = [];
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
    groupBy.mockResolvedValueOnce([]); // delai moyen, periode actuelle
    groupBy.mockResolvedValueOnce([]); // delai moyen, periode precedente

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
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);

    const stats = await getActiviteStats("30j");

    expect(stats.parType[0]).toMatchObject({ actionType: "type_inconnu_xyz", label: "type_inconnu_xyz" });
  });

  it("calcule la variation par rapport à la période précédente de même durée", async () => {
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 20 }]); // periode actuelle
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 10 }]); // periode precedente
    groupBy.mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]); // demandeurs, actuelle
    groupBy.mockResolvedValueOnce([{ userId: "u1" }]); // demandeurs, precedente
    groupBy.mockResolvedValueOnce([]); // delai, actuelle
    groupBy.mockResolvedValueOnce([]); // delai, precedente

    const stats = await getActiviteStats("30j");

    expect(stats.total.variation).toBe(100); // (20-10)/10 * 100
    expect(stats.parType[0].variation).toBe(100);
    expect(stats.demandeursDistincts.variation).toBe(100); // (2-1)/1 * 100
  });

  it('ne calcule pas de variation pour la période "Depuis le début" (pas de période précédente)', async () => {
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 20 }]);
    groupBy.mockResolvedValueOnce([{ userId: "u1" }]);
    groupBy.mockResolvedValueOnce([]);

    const stats = await getActiviteStats("tout");

    expect(stats.total.variation).toBeNull();
    expect(stats.parType[0].variation).toBeNull();
    expect(stats.demandeursDistincts.variation).toBeNull();
    expect(stats.delaiMoyenPremiereReponse.variation).toBeNull();
    // Une seule requête par métrique (pas de periode precedente a calculer)
    expect(groupBy).toHaveBeenCalledTimes(3);
  });

  it("calcule le délai moyen (en heures) entre l'inscription et la première action, pour les demandeurs inscrits sur la période", async () => {
    groupBy.mockResolvedValueOnce([]); // actionType, actuelle
    groupBy.mockResolvedValueOnce([]); // actionType, precedente
    groupBy.mockResolvedValueOnce([]); // demandeurs distincts, actuelle
    groupBy.mockResolvedValueOnce([]); // demandeurs distincts, precedente
    const inscription = new Date("2026-01-01T00:00:00Z");
    groupBy.mockResolvedValueOnce([
      { inscriptionAt: inscription, premiereActionAt: new Date("2026-01-02T00:00:00Z") }, // +24h
      { inscriptionAt: inscription, premiereActionAt: new Date("2026-01-01T12:00:00Z") }, // +12h
    ]); // delai, actuelle
    groupBy.mockResolvedValueOnce([]); // delai, precedente (aucun demandeur avec action -> null)

    const stats = await getActiviteStats("30j");

    expect(stats.delaiMoyenPremiereReponse.valeurHeures).toBe(18); // (24+12)/2
    expect(stats.delaiMoyenPremiereReponse.variation).toBeNull(); // periode precedente sans donnee -> pas de variation
  });

  it("delaiMoyenPremiereReponse.valeurHeures est null quand aucun demandeur inscrit sur la période n'a reçu d'action", async () => {
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]); // delai, actuelle : aucun demandeur avec action
    groupBy.mockResolvedValueOnce([]);

    const stats = await getActiviteStats("30j");

    expect(stats.delaiMoyenPremiereReponse.valeurHeures).toBeNull();
  });

  it("sans filtre département : ne joint pas parcours_prevention pour la répartition par type (le délai moyen joint toujours users → parcours_prevention → parcours_actions)", async () => {
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);

    await getActiviteStats("30j");

    // demandeurs distincts (1 jointure x 2 periodes) + delai moyen (2 jointures x 2 periodes) = 6
    expect(innerJoinCallCount).toBe(6);
  });

  it("avec filtre département : joint parcours_prevention et filtre sur le département", async () => {
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);

    await getActiviteStats("30j", "36");

    // répartition par type (2 jointures) + demandeurs distincts (2) + delai moyen (4) = 8
    expect(innerJoinCallCount).toBe(8);
    const sql = compileAllWheres();
    expect(sql).toContain("code_departement");
    expect(sql).toContain('"parcours_actions"."created_at" >=');
  });
});
