import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  countDossiersEnAttenteDepot,
  countDossiersDeposesDN,
  countDossiersInstruitsValides,
} from "./tableau-de-bord.service";

// Capture la condition WHERE (et le recours a innerJoin) passee au query builder,
// pour valider la date de reference et les filtres de chaque nouveau compteur DN
// sans base de donnees. Voir Copilot review PR #280.
let capturedWhere: SQL | undefined;
let innerJoinCalled = false;

vi.mock("@/shared/database/client", () => ({
  db: {
    select: () => {
      const where = (condition: SQL) => {
        capturedWhere = condition;
        return Promise.resolve([{ count: 3 }]);
      };
      const innerJoin = () => {
        innerJoinCalled = true;
        return { where };
      };
      return { from: () => ({ where, innerJoin }) };
    },
  },
}));

const dialect = new PgDialect();

function compile(): { sql: string; params: unknown[] } {
  const { sql, params } = dialect.sqlToQuery(capturedWhere as SQL);
  return { sql, params: params as unknown[] };
}

const debut = new Date("2026-01-01T00:00:00Z");
const fin = new Date("2026-02-01T00:00:00Z");

describe("Compteurs DN du tableau de bord — date de reference et filtres", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedWhere = undefined;
    innerJoinCalled = false;
  });

  describe("countDossiersEnAttenteDepot — cree mais pas encore depose (ADR-0009)", () => {
    it("filtre sur la date de creation du dossier, submitted_at NULL, etape eligibilite", async () => {
      const total = await countDossiersEnAttenteDepot(debut, fin);
      const { sql, params } = compile();

      expect(total).toBe(3);
      // Date de reference = created_at (et non submitted_at / processed_at).
      expect(sql).toContain('"dossiers_demarches_simplifiees"."created_at" >=');
      expect(sql).toContain('"dossiers_demarches_simplifiees"."created_at" <');
      expect(sql).not.toContain('"dossiers_demarches_simplifiees"."submitted_at" >=');
      expect(sql).not.toContain("processed_at");
      // En attente de depot = pas encore depose.
      expect(sql).toContain('"dossiers_demarches_simplifiees"."submitted_at" is null');
      // Scope etape eligibilite (parcours ET dossier).
      expect(sql).toContain('"parcours_prevention"."current_step" =');
      expect(sql).toContain('"dossiers_demarches_simplifiees"."step" =');
      expect(params).toContain("eligibilite");
    });
  });

  describe("countDossiersDeposesDN — deposes sur DN", () => {
    it("filtre sur submitted_at (date de depot), submitted_at NON NULL", async () => {
      const total = await countDossiersDeposesDN(debut, fin);
      const { sql } = compile();

      expect(total).toBe(3);
      // Date de reference = submitted_at, pas la date de creation.
      expect(sql).toContain('"dossiers_demarches_simplifiees"."submitted_at" >=');
      expect(sql).toContain('"dossiers_demarches_simplifiees"."submitted_at" <');
      expect(sql).toContain('"dossiers_demarches_simplifiees"."submitted_at" is not null');
      expect(sql).not.toContain("created_at");
      expect(sql).not.toContain("processed_at");
    });

    it("sans departement ni partner, ne joint pas parcours_prevention", async () => {
      await countDossiersDeposesDN(debut, fin);
      expect(innerJoinCalled).toBe(false);
    });

    it("avec un departement, joint parcours_prevention et applique le filtre territorial", async () => {
      const total = await countDossiersDeposesDN(debut, fin, "035");
      const { sql, params } = compile();

      expect(total).toBe(3);
      expect(innerJoinCalled).toBe(true);
      expect(sql).toContain('"parcours_prevention"."rga_simulation_data" is not null');
      expect(sql).toContain("code_departement");
      // Le code departement est normalise (035 -> 35).
      expect(params).toContain("35");
      // La date de reference reste le depot.
      expect(sql).toContain('"dossiers_demarches_simplifiees"."submitted_at" >=');
    });
  });

  describe("countDossiersInstruitsValides — instruits et acceptes par la DDT", () => {
    it("filtre sur processed_at (date de decision DDT) et ds_status = accepte", async () => {
      const total = await countDossiersInstruitsValides(debut, fin);
      const { sql, params } = compile();

      expect(total).toBe(3);
      // Date de reference = processed_at (date de traitement DS), pas creation/depot.
      expect(sql).toContain('"dossiers_demarches_simplifiees"."processed_at" >=');
      expect(sql).toContain('"dossiers_demarches_simplifiees"."processed_at" <');
      expect(sql).toContain('"dossiers_demarches_simplifiees"."processed_at" is not null');
      expect(sql).toContain('"dossiers_demarches_simplifiees"."ds_status" =');
      expect(params).toContain("accepte");
      expect(sql).not.toContain("created_at");
      expect(sql).not.toContain("submitted_at");
    });
  });
});
