import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

const groupBy = vi.fn();
const whereResolve = vi.fn();
let capturedWheres: SQL[] = [];
let innerJoinCallCount = 0;

vi.mock("@/shared/database/client", () => ({
  db: {
    select: () => {
      const where = (condition: SQL) => {
        capturedWheres.push(condition);
        return {
          groupBy,
          // Certaines requêtes (countDemandeursInscrits) n'ont pas de .groupBy() et sont
          // directement awaited après .where() : rendre l'objet retourné "thenable".
          then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
            Promise.resolve(whereResolve()).then(resolve, reject),
        };
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
    groupBy.mockResolvedValueOnce([]); // premiere reponse (rows), periode actuelle
    groupBy.mockResolvedValueOnce([]); // premiere reponse (rows), periode precedente
    whereResolve.mockResolvedValueOnce([]); // demandeurs inscrits, periode actuelle
    whereResolve.mockResolvedValueOnce([]); // demandeurs inscrits, periode precedente

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
    whereResolve.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);

    const stats = await getActiviteStats("30j");

    expect(stats.parType[0]).toMatchObject({ actionType: "type_inconnu_xyz", label: "type_inconnu_xyz" });
  });

  it("calcule la variation par rapport à la période précédente de même durée", async () => {
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 20 }]); // periode actuelle
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 10 }]); // periode precedente
    groupBy.mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }]); // demandeurs, actuelle
    groupBy.mockResolvedValueOnce([{ userId: "u1" }]); // demandeurs, precedente
    groupBy.mockResolvedValueOnce([]); // premiere reponse, actuelle
    groupBy.mockResolvedValueOnce([]); // premiere reponse, precedente
    whereResolve.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);

    const stats = await getActiviteStats("30j");

    expect(stats.total.variation).toBe(100); // (20-10)/10 * 100
    expect(stats.parType[0].variation).toBe(100);
    expect(stats.demandeursDistincts.variation).toBe(100); // (2-1)/1 * 100
  });

  it('ne calcule pas de variation pour la période "Depuis le début" (pas de période précédente)', async () => {
    groupBy.mockResolvedValueOnce([{ actionType: "appel_effectue", count: 20 }]);
    groupBy.mockResolvedValueOnce([{ userId: "u1" }]);
    groupBy.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);

    const stats = await getActiviteStats("tout");

    expect(stats.total.variation).toBeNull();
    expect(stats.parType[0].variation).toBeNull();
    expect(stats.demandeursDistincts.variation).toBeNull();
    expect(stats.delaiMoyenPremiereReponse.variation).toBeNull();
    expect(stats.demandeursSansReponse.variation).toBeNull();
    // Une seule requête par métrique groupée (pas de periode precedente a calculer)
    expect(groupBy).toHaveBeenCalledTimes(3);
    expect(whereResolve).toHaveBeenCalledTimes(1);
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
    ]); // premiere reponse (rows), actuelle
    groupBy.mockResolvedValueOnce([]); // premiere reponse (rows), precedente : aucune donnee -> null
    whereResolve.mockResolvedValueOnce([{ id: "u1" }, { id: "u2" }]); // demandeurs inscrits, actuelle
    whereResolve.mockResolvedValueOnce([]); // demandeurs inscrits, precedente

    const stats = await getActiviteStats("30j");

    expect(stats.delaiMoyenPremiereReponse.valeurHeures).toBe(18); // (24+12)/2
    expect(stats.delaiMoyenPremiereReponse.variation).toBeNull(); // periode precedente sans donnee -> pas de variation
  });

  it("delaiMoyenPremiereReponse.valeurHeures est null quand aucun demandeur inscrit sur la période n'a reçu d'action", async () => {
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]); // premiere reponse, actuelle : aucun demandeur avec action
    groupBy.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);

    const stats = await getActiviteStats("30j");

    expect(stats.delaiMoyenPremiereReponse.valeurHeures).toBeNull();
  });

  it("demandeursSansReponse : compte les inscrits de la période exclus du délai moyen (aucune action reçue), et calcule sa variation", async () => {
    groupBy.mockResolvedValueOnce([]); // actionType, actuelle
    groupBy.mockResolvedValueOnce([]); // actionType, precedente
    groupBy.mockResolvedValueOnce([]); // demandeurs distincts, actuelle
    groupBy.mockResolvedValueOnce([]); // demandeurs distincts, precedente
    groupBy.mockResolvedValueOnce([
      { inscriptionAt: new Date("2026-01-01T00:00:00Z"), premiereActionAt: new Date("2026-01-01T06:00:00Z") },
    ]); // premiere reponse (rows), actuelle : 1 demandeur avec reponse
    groupBy.mockResolvedValueOnce([
      { inscriptionAt: new Date("2025-12-01T00:00:00Z"), premiereActionAt: new Date("2025-12-01T06:00:00Z") },
    ]); // premiere reponse (rows), precedente : 1 demandeur avec reponse
    whereResolve.mockResolvedValueOnce([{ id: "u1" }, { id: "u2" }, { id: "u3" }, { id: "u4" }]); // 4 inscrits, actuelle
    whereResolve.mockResolvedValueOnce([{ id: "u5" }, { id: "u6" }]); // 2 inscrits, precedente

    const stats = await getActiviteStats("30j");

    expect(stats.demandeursSansReponse.valeur).toBe(3); // 4 inscrits - 1 avec reponse
    expect(stats.demandeursSansReponse.variation).toBe(200); // precedent = 2-1=1 ; (3-1)/1*100
  });

  it("sans filtre département : ne joint pas parcours_prevention pour la répartition par type (les autres métriques joignent toujours)", async () => {
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);

    await getActiviteStats("30j");

    // demandeurs distincts (1 jointure x 2 periodes = 2)
    // + premiere reponse par periode : inscrits (1 jointure) + rows (2 jointures) = 3 jointures x 2 periodes = 6
    expect(innerJoinCallCount).toBe(8);
  });

  it("avec filtre département : joint parcours_prevention et filtre sur le département", async () => {
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    groupBy.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);
    whereResolve.mockResolvedValueOnce([]);

    await getActiviteStats("30j", "36");

    // répartition par type (2) + demandeurs distincts (2) + premiere reponse (inscrits:1 + rows:2 = 3 x 2 periodes = 6)
    expect(innerJoinCallCount).toBe(10);
    const sql = compileAllWheres();
    expect(sql).toContain("code_departement");
    expect(sql).toContain('"parcours_actions"."created_at" >=');
  });
});
