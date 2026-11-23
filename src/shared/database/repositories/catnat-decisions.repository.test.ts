import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../client";
import { CatnatDecisionsRepository, decisionsARetirer } from "./catnat-decisions.repository";
import type { NewCatnatDecision } from "../schema/catnat-decisions";

// Le client n'expose que `transaction` : une écriture hors transaction ferait échouer le test.
vi.mock("../client", () => ({ db: { transaction: vi.fn() } }));

const cle = (codeInsee: string, dateArrete: string, dateDebutEvt = "2025-01-01") => ({
  codeInsee,
  dateArrete,
  dateDebutEvt,
});

const decision = (codeInsee: string, dateArrete: string): NewCatnatDecision => ({
  ...cle(codeInsee, dateArrete),
  libelleCommune: "Commune",
  datePublicationJo: "2026-05-14",
  dateFinEvt: "2025-12-31",
  decision: "non_reconnue",
  motif: "critère météorologique non satisfait",
  source: "data.gouv",
});

describe("decisionsARetirer", () => {
  it("retire une décision que la source ne publie plus", () => {
    const enBase = [cle("36044", "2026-05-11"), cle("54395", "2026-05-11")];

    expect(decisionsARetirer(enBase, [cle("36044", "2026-05-11")])).toEqual([cle("54395", "2026-05-11")]);
  });

  it("deux décisions d'une commune sur deux arrêtés restent distinctes", () => {
    const enBase = [cle("36044", "2025-09-16", "2024-01-01"), cle("36044", "2026-05-11")];

    expect(decisionsARetirer(enBase, enBase)).toEqual([]);
  });
});

describe("remplacerSource — une seule transaction", () => {
  const ordre: string[] = [];
  let enBase: ReturnType<typeof cle>[] = [];

  const tx = {
    select: vi.fn(() => ({ from: () => ({ where: () => Promise.resolve(enBase) }) })),
    delete: vi.fn(() => ({
      where: vi.fn(() => {
        ordre.push("retrait");
        return Promise.resolve();
      }),
    })),
    insert: vi.fn(() => ({
      values: () => ({
        onConflictDoUpdate: () => {
          ordre.push("écriture");
          return Promise.resolve();
        },
      }),
    })),
  };

  const repo = new CatnatDecisionsRepository();

  beforeEach(() => {
    vi.clearAllMocks();
    ordre.length = 0;
    enBase = [cle("36044", "2026-05-11"), cle("54395", "2026-05-11")];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(tx));
  });

  it("retire l'absente, écrit les reçues, et compte les nouvelles", async () => {
    const bilan = await repo.remplacerSource(
      "data.gouv",
      [decision("36044", "2026-05-11"), decision("36044", "2026-11-13")],
      { retirerAbsentes: true }
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(ordre).toEqual(["retrait", "écriture"]);
    expect(bilan).toEqual({ ajoutees: 1, retirees: 1 });
  });

  it("sans retrait demandé, rien n'est supprimé", async () => {
    const bilan = await repo.remplacerSource("data.gouv", [decision("36044", "2026-05-11")], {
      retirerAbsentes: false,
    });

    expect(ordre).toEqual(["écriture"]);
    expect(bilan).toEqual({ ajoutees: 0, retirees: 0 });
  });
});
