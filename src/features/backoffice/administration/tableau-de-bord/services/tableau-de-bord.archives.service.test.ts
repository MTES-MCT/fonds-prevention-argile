import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAutresDemandesArchiveesDetail, getTableauDeBordStats } from "./tableau-de-bord.service";
import { db } from "@/shared/database/client";

vi.mock("@/shared/database/client", () => ({ db: { select: vi.fn() } }));
vi.mock("../../acquisition/adapters/matomo-api.adapter", () => ({
  fetchMatomoEvents: vi.fn(),
  fetchMatomoEventsByDepartment: vi.fn(),
  fetchMatomoUniqueVisitors: vi.fn(),
  fetchMatomoSimulationsGroupedByDepartment: vi.fn(),
  fetchMatomoSimulationsGroupedByDimension: vi.fn(),
  buildPartnerSegment: vi.fn(() => undefined),
}));

/** Chaque requête Drizzle, quels que soient ses maillons, se résout sur la réponse suivante de la file. */
function fileDeReponses(reponses: unknown[][]) {
  const file = [...reponses];
  vi.mocked(db.select).mockImplementation(() => {
    const reponse = file.shift() ?? [];
    const requete: Record<string, unknown> = {
      then: (resoudre: (v: unknown) => unknown) => Promise.resolve(reponse).then(resoudre),
    };
    for (const maillon of ["from", "where", "groupBy", "innerJoin", "leftJoin", "orderBy"]) {
      requete[maillon] = () => requete;
    }
    return requete as never;
  });
}

const ARCHIVE = new Date(2026, 9, 1);
const archivage = (archiveReason: string | null, n = 1) =>
  Array.from({ length: n }, (_, i) => ({
    parcoursId: `${archiveReason ?? "null"}-${i}`,
    archivedAt: ARCHIVE,
    archiveReason,
    userPrenom: "Jeanne",
    userNom: "Martin",
    agentGivenName: null,
    agentUsualName: null,
    entrepriseAmoNom: null,
    rgaSimulationData: null,
    rgaSimulationDataAgent: null,
  }));

// Six motifs saisis, et quatre archivages « Sans motif » sous des formes différentes : ce dernier tombe dans « Autres ».
const REPARTITION_EN_BASE = [
  { reason: "Abandon", count: 10 },
  { reason: "Injoignable", count: 9 },
  { reason: "Reste à charge", count: 8 },
  { reason: "Déménagement", count: 7 },
  { reason: "Travaux déjà faits", count: 6 },
  { reason: "Autre dispositif", count: 5 },
  { reason: null, count: 1 },
  { reason: "", count: 1 },
  { reason: "   ", count: 1 },
  { reason: "Sans motif", count: 1 },
];

describe("demandes archivées : le compteur « Sans motif » et son détail concordent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("liste dans « Autres » toutes les demandes que le compteur y range, raisons blanches comprises", async () => {
    fileDeReponses([
      REPARTITION_EN_BASE,
      [],
      [
        ...archivage("Abandon", 2),
        ...archivage("Autre dispositif", 5),
        ...archivage(null),
        ...archivage(""),
        ...archivage("   "),
        ...archivage("Sans motif"),
      ],
    ]);

    const { demandes } = await getAutresDemandesArchiveesDetail("30j");

    const parMotif = demandes.reduce<Record<string, number>>(
      (acc, d) => ({ ...acc, [d.raison]: (acc[d.raison] ?? 0) + 1 }),
      {}
    );
    expect(parMotif).toEqual({ "Autre dispositif": 5, "Sans motif": 4 });
  });
});

describe("getTableauDeBordStats — demandes archivées", () => {
  it("range les raisons vides ou blanches sous « Sans motif », hors du top 5 ici", async () => {
    vi.mocked(db.select).mockImplementation(() => {
      const requete: Record<string, unknown> = {
        then: (resoudre: (v: unknown) => unknown) => Promise.resolve([{ count: 0 }]).then(resoudre),
      };
      for (const maillon of ["from", "where", "innerJoin", "leftJoin", "orderBy"]) requete[maillon] = () => requete;
      requete.groupBy = () => ({
        then: (resoudre: (v: unknown) => unknown) => Promise.resolve(REPARTITION_EN_BASE).then(resoudre),
      });
      return requete as never;
    });

    const stats = await getTableauDeBordStats("30j");

    expect(stats.demandesArchiveesDetail?.total).toBe(49);
    expect(stats.demandesArchiveesDetail?.autresMotifs.map((m) => [m.raison, m.count])).toEqual([
      ["Autre dispositif", 5],
      ["Sans motif", 4],
    ]);
  });
});
