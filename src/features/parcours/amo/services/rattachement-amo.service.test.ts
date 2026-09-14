import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/shared/database/client";
import { StatutValidationAmo } from "../domain/value-objects";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { Step, Status } from "../../core";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn(), update: vi.fn() },
}));
vi.mock("./amo-selection.service", () => ({ findFirstAmoForTerritory: vi.fn() }));

import { rattacherAmo } from "./rattachement-amo.service";
import { findFirstAmoForTerritory } from "./amo-selection.service";

/** Chaîne `db.select().from().where().limit()` -> rows (un appel). */
function mockSelectOnce(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValueOnce({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

/** Chaîne `db.select().from().innerJoin().where().orderBy().limit()` (trace d'audit). */
function mockSelectJoinOnce(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValueOnce({
    from: () => ({
      innerJoin: () => ({ where: () => ({ orderBy: () => ({ limit: () => Promise.resolve(rows) }) }) }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

function mockUpdateCapturingSet(): { sets: Record<string, unknown>[] } {
  const sets: Record<string, unknown>[] = [];
  vi.mocked(db.update).mockReturnValue({
    set: (payload: Record<string, unknown>) => {
      sets.push(payload);
      return { where: () => Promise.resolve(undefined) };
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return { sets };
}

// 36044 -> Indre, AMO obligatoire par défaut. 75001 -> facultatif.
const parcoursObligatoire = {
  id: "p1",
  currentStep: Step.ELIGIBILITE,
  currentStatus: Status.TODO,
  archivedAt: null,
  completedAt: null,
  rgaSimulationData: { logement: { commune: "36044", epci: null } },
  rgaSimulationDataAgent: null,
};
const validationDetachee = { id: "val-1", statut: StatutValidationAmo.SANS_AMO, entrepriseAmoId: null };

describe("rattacherAmo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("restaure l'AMO d'origine trouvée dans la trace d'audit, en en_attente", async () => {
    mockSelectOnce([parcoursObligatoire]);
    mockSelectOnce([validationDetachee]);
    mockSelectJoinOnce([{ entrepriseAmoId: "e-origine" }]);
    mockSelectOnce([{ nom: "Soliha 36" }]);
    const { sets } = mockUpdateCapturingSet();

    const result = await rattacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.entrepriseAmoId).toBe("e-origine");
      expect(result.data.origine).toBe("audit");
    }
    expect(sets[0]).toMatchObject({
      entrepriseAmoId: "e-origine",
      statut: StatutValidationAmo.EN_ATTENTE,
      attributionMode: AttributionAmoMode.AUTO_OBLIGATOIRE,
    });
    // L'étape du parcours ne doit jamais être touchée.
    expect(sets).toHaveLength(1);
    expect(findFirstAmoForTerritory).not.toHaveBeenCalled();
  });

  it("retombe sur l'AMO du territoire quand aucune trace d'audit n'existe", async () => {
    mockSelectOnce([parcoursObligatoire]);
    mockSelectOnce([validationDetachee]);
    mockSelectJoinOnce([]);
    mockSelectOnce([{ nom: "Soliha 36" }]);
    mockUpdateCapturingSet();
    vi.mocked(findFirstAmoForTerritory).mockResolvedValue({ id: "e-territoire" });

    const result = await rattacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origine).toBe("territoire");
    expect(findFirstAmoForTerritory).toHaveBeenCalledWith("36044", null);
  });

  it("refuse un département à AMO facultative (l'autonomie y est légitime)", async () => {
    mockSelectOnce([{ ...parcoursObligatoire, rgaSimulationData: { logement: { commune: "75001" } } }]);
    const { sets } = mockUpdateCapturingSet();

    const result = await rattacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("facultative");
    expect(sets).toHaveLength(0);
  });

  it("refuse un parcours archivé", async () => {
    mockSelectOnce([{ ...parcoursObligatoire, archivedAt: new Date() }]);
    const { sets } = mockUpdateCapturingSet();

    const result = await rattacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("archivé");
    expect(sets).toHaveLength(0);
  });

  it("refuse un parcours qui a déjà une AMO", async () => {
    mockSelectOnce([parcoursObligatoire]);
    mockSelectOnce([{ ...validationDetachee, statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entrepriseAmoId: "e1" }]);
    const { sets } = mockUpdateCapturingSet();

    const result = await rattacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("déjà une AMO");
    expect(sets).toHaveLength(0);
  });

  it("refuse quand aucune AMO n'est trouvable", async () => {
    mockSelectOnce([parcoursObligatoire]);
    mockSelectOnce([validationDetachee]);
    mockSelectJoinOnce([]);
    const { sets } = mockUpdateCapturingSet();
    vi.mocked(findFirstAmoForTerritory).mockResolvedValue(null);

    const result = await rattacherAmo({ parcoursId: "p1" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Aucune AMO");
    expect(sets).toHaveLength(0);
  });
});
