import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn(), update: vi.fn() },
}));

import { findListesDiffusionAvecEmail, retirerEmailDesListes, type ListeDiffusion } from "./listes-diffusion.service";
import { db } from "@/shared/database/client";

interface AmoRow {
  id: string;
  nom: string;
  emails: string;
}
interface AvRow {
  id: string;
  nom: string;
  emails: string[];
}

/** `db.select().from(table)` est awaité tel quel dans la recherche. */
function mockSelectTables(amos: AmoRow[], avs: AvRow[]) {
  let appel = 0;
  vi.mocked(db.select).mockImplementation(
    () =>
      ({
        from: () => Promise.resolve(appel++ === 0 ? amos : avs),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
  );
}

describe("findListesDiffusionAvecEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("repère l'adresse dans une liste AMO séparée par point-virgule", async () => {
    mockSelectTables([{ id: "amo-1", nom: "Soliha 36", emails: "contact@soliha.fr;jean@soliha.fr" }], []);

    expect(await findListesDiffusionAvecEmail("jean@soliha.fr")).toEqual([
      { type: "amo", id: "amo-1", nom: "Soliha 36", estDerniereAdresse: false },
    ]);
  });

  it("ignore la casse et les espaces de bord", async () => {
    mockSelectTables([{ id: "amo-1", nom: "Soliha 36", emails: "contact@soliha.fr; Jean@Soliha.FR " }], []);

    expect(await findListesDiffusionAvecEmail("jean@soliha.fr")).toHaveLength(1);
  });

  it("signale une dernière adresse (structure sans destinataire de remplacement)", async () => {
    mockSelectTables([{ id: "amo-1", nom: "Soliha 36", emails: "jean@soliha.fr" }], []);

    expect(await findListesDiffusionAvecEmail("jean@soliha.fr")).toEqual([
      { type: "amo", id: "amo-1", nom: "Soliha 36", estDerniereAdresse: true },
    ]);
  });

  it("repère l'adresse dans un tableau Aller-vers", async () => {
    mockSelectTables([], [{ id: "av-1", nom: "Adil 36", emails: ["accueil@adil36.fr", "jean@adil36.fr"] }]);

    expect(await findListesDiffusionAvecEmail("jean@adil36.fr")).toEqual([
      { type: "allers_vers", id: "av-1", nom: "Adil 36", estDerniereAdresse: false },
    ]);
  });

  it("ne retourne rien si l'adresse ne figure nulle part", async () => {
    mockSelectTables(
      [{ id: "amo-1", nom: "Soliha 36", emails: "contact@soliha.fr" }],
      [{ id: "av-1", nom: "Adil 36", emails: ["accueil@adil36.fr"] }]
    );

    expect(await findListesDiffusionAvecEmail("jean@ailleurs.fr")).toEqual([]);
  });

  it("ne cherche rien pour une adresse vide", async () => {
    expect(await findListesDiffusionAvecEmail("   ")).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("retirerEmailDesListes", () => {
  let set: ReturnType<typeof vi.fn>;

  function mockExecutor(row: AmoRow | AvRow) {
    set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    return {
      select: () => ({ from: () => ({ where: () => Promise.resolve([row]) }) }),
      update: () => ({ set }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  beforeEach(() => vi.clearAllMocks());

  it("retire l'adresse d'une liste AMO en préservant le format point-virgule", async () => {
    const liste: ListeDiffusion = { type: "amo", id: "amo-1", nom: "Soliha 36", estDerniereAdresse: false };
    const executor = mockExecutor({ id: "amo-1", nom: "Soliha 36", emails: "contact@soliha.fr;jean@soliha.fr" });

    const result = await retirerEmailDesListes("jean@soliha.fr", [liste], executor);

    expect(set).toHaveBeenCalledWith({ emails: "contact@soliha.fr" });
    expect(result.retirees).toEqual([liste]);
    expect(result.conservees).toEqual([]);
  });

  it("retire l'adresse d'un tableau Aller-vers", async () => {
    const liste: ListeDiffusion = { type: "allers_vers", id: "av-1", nom: "Adil 36", estDerniereAdresse: false };
    const executor = mockExecutor({ id: "av-1", nom: "Adil 36", emails: ["accueil@adil36.fr", "jean@adil36.fr"] });

    await retirerEmailDesListes("jean@adil36.fr", [liste], executor);

    expect(set).toHaveBeenCalledWith({ emails: ["accueil@adil36.fr"] });
  });

  it("ne vide pas la liste si elle a changé depuis le calcul de estDerniereAdresse", async () => {
    // L'appelant croit qu'il reste une autre adresse ; la base dit le contraire.
    const liste: ListeDiffusion = { type: "amo", id: "amo-1", nom: "Soliha 36", estDerniereAdresse: false };
    const executor = mockExecutor({ id: "amo-1", nom: "Soliha 36", emails: "jean@soliha.fr" });

    const result = await retirerEmailDesListes("jean@soliha.fr", [liste], executor);

    expect(set).not.toHaveBeenCalled();
    expect(result.retirees).toEqual([]);
    expect(result.conservees).toEqual([{ ...liste, estDerniereAdresse: true }]);
  });

  it("ne vide pas un tableau Aller-vers devenu réduit à cette seule adresse", async () => {
    const liste: ListeDiffusion = { type: "allers_vers", id: "av-1", nom: "Adil 36", estDerniereAdresse: false };
    const executor = mockExecutor({ id: "av-1", nom: "Adil 36", emails: ["jean@adil36.fr"] });

    const result = await retirerEmailDesListes("jean@adil36.fr", [liste], executor);

    expect(set).not.toHaveBeenCalled();
    expect(result.conservees).toHaveLength(1);
  });

  it("ne vide jamais une liste : la dernière adresse est conservée", async () => {
    const liste: ListeDiffusion = { type: "amo", id: "amo-1", nom: "Soliha 36", estDerniereAdresse: true };
    const executor = mockExecutor({ id: "amo-1", nom: "Soliha 36", emails: "jean@soliha.fr" });

    const result = await retirerEmailDesListes("jean@soliha.fr", [liste], executor);

    expect(set).not.toHaveBeenCalled();
    expect(result.retirees).toEqual([]);
    expect(result.conservees).toEqual([liste]);
  });
});
