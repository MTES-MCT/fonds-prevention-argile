import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../client";
import { CatastrophesNaturellesRepository, periodesARetirer } from "./catastrophes-naturelles.repository";
import type { NewCatastropheNaturelle } from "../schema/catastrophes-naturelles";

// Le client n'expose que `transaction` : une écriture hors transaction ferait échouer le test.
vi.mock("../client", () => ({ db: { transaction: vi.fn() } }));

const periode = (codeNationalCatnat: string, codeInsee: string, dateDebutEvt: string) => ({
  codeNationalCatnat,
  codeInsee,
  dateDebutEvt,
});

const ligne = (codeNationalCatnat: string, codeInsee: string, dateDebutEvt: string): NewCatastropheNaturelle => ({
  ...periode(codeNationalCatnat, codeInsee, dateDebutEvt),
  dateFinEvt: "2025-12-31",
  datePublicationArrete: "2026-05-10",
  datePublicationJo: "2026-05-13",
  libelleRisqueJo: "Sécheresse",
  libelleCommune: "Châteauroux",
});

describe("periodesARetirer — la source fait foi pour les arrêtés qu'elle renvoie", () => {
  it("retire la période dont la date a été corrigée à la source", () => {
    const enBase = [periode("INTE2612297A", "36044", "2024-12-31")];
    const recues = [periode("INTE2612297A", "36044", "2025-01-01")];

    expect(periodesARetirer(enBase, recues)).toEqual(enBase);
  });

  it("garde les deux périodes d'un même arrêté pour la même commune", () => {
    const enBase = [periode("IOME2316198A", "54395", "2022-01-01"), periode("IOME2316198A", "54395", "2022-07-01")];

    expect(periodesARetirer(enBase, enBase)).toEqual([]);
  });

  it("ne touche pas un arrêté de la commune que la source n'a pas renvoyé", () => {
    const enBase = [periode("INTE1914147A", "36044", "2018-07-01")];
    const recues = [periode("INTE2612297A", "36044", "2025-01-01")];

    expect(periodesARetirer(enBase, recues)).toEqual([]);
  });

  it("ne touche pas le même arrêté dans une commune absente de la réponse", () => {
    const enBase = [periode("INTE2612297A", "36211", "2024-12-31")];
    const recues = [periode("INTE2612297A", "36044", "2025-01-01")];

    expect(periodesARetirer(enBase, recues)).toEqual([]);
  });
});

describe("remplacerPeriodes — retrait et écriture dans une seule transaction", () => {
  const ordre: string[] = [];
  let enBase: ReturnType<typeof periode>[] = [];
  let ecritureEchoue = false;

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
          return ecritureEchoue ? Promise.reject(new Error("écriture refusée")) : Promise.resolve();
        },
      }),
    })),
  };

  const repo = new CatastrophesNaturellesRepository();

  beforeEach(() => {
    vi.clearAllMocks();
    ordre.length = 0;
    enBase = [];
    ecritureEchoue = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(tx));
  });

  it("retire l'ancienne période puis écrit la nouvelle, dans la même transaction", async () => {
    enBase = [periode("INTE2612297A", "36044", "2024-12-31")];

    await repo.remplacerPeriodes([ligne("INTE2612297A", "36044", "2025-01-01")]);

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(ordre).toEqual(["retrait", "écriture"]);
  });

  it("rien à retirer → une écriture seule", async () => {
    enBase = [periode("INTE2612297A", "36044", "2025-01-01")];

    await repo.remplacerPeriodes([ligne("INTE2612297A", "36044", "2025-01-01")]);

    expect(ordre).toEqual(["écriture"]);
  });

  it("écriture en échec → l'erreur sort de la transaction, qui annule le retrait", async () => {
    enBase = [periode("INTE2612297A", "36044", "2024-12-31")];
    ecritureEchoue = true;

    await expect(repo.remplacerPeriodes([ligne("INTE2612297A", "36044", "2025-01-01")])).rejects.toThrow(
      "écriture refusée"
    );
  });

  it("aucune ligne → aucune transaction ouverte", async () => {
    await repo.remplacerPeriodes([]);

    expect(db.transaction).not.toHaveBeenCalled();
  });
});
