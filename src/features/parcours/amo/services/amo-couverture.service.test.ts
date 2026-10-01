import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/shared/database/client";
import { amoCouvreTerritoire, listerAmosDuTerritoire, resoudreAmoDuTerritoire } from "./amo-couverture.service";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn() },
}));

const HABITAT = {
  id: "dc467f8e-6bc5-408f-a263-1474b03387f9",
  nom: "Habitat Cambrésis",
  siret: "99999999900012",
  departements: "Nord 59",
  emails: "habitat@example.org",
  telephone: "03 27 00 00 01",
  adresse: "Cambrai",
  horaires: null,
};
const ARGILES = { ...HABITAT, id: "6a4403e5-1c9d-4e3e-b2b1-77ed657467a6", nom: "Argiles du Nord" };
const SOLIHA_54 = {
  ...HABITAT,
  id: "9bf88991-f647-4661-8096-19c62d223186",
  nom: "Soliha",
  departements: "Meurthe-et-Moselle 54",
};

/** Les trois lectures, dans l'ordre : AMO, liaisons communes, liaisons EPCI. */
function mockBase(liaisons: { communes?: { id: string; code: string }[]; epcis?: { id: string; code: string }[] }) {
  const lectures = [[HABITAT, ARGILES, SOLIHA_54], liaisons.communes ?? [], liaisons.epcis ?? []];
  let appel = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.select).mockImplementation((() => ({ from: () => Promise.resolve(lectures[appel++]) })) as any);
}

const CAMBRAI = { codeInsee: "59597", codeEpci: "200068500" };

describe("amo-couverture.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rapproche les liaisons EPCI de leurs AMO et les ordonne par nom", async () => {
    mockBase({ epcis: [HABITAT, ARGILES].map((amo) => ({ id: amo.id, code: "200068500" })) });

    const amos = await listerAmosDuTerritoire(CAMBRAI);

    expect(amos.map((amo) => amo.nom)).toEqual(["Argiles du Nord", "Habitat Cambrésis"]);
    expect(amos[0]).toEqual(ARGILES);
  });

  it("rattache une AMO par sa commune avant toute autre", async () => {
    mockBase({
      communes: [{ id: SOLIHA_54.id, code: "59597" }],
      epcis: [{ id: HABITAT.id, code: "200068500" }],
    });

    expect((await listerAmosDuTerritoire(CAMBRAI)).map((amo) => amo.nom)).toEqual(["Soliha"]);
  });

  it("résout plusieurs AMO sans en choisir une", async () => {
    mockBase({ epcis: [HABITAT, ARGILES].map((amo) => ({ id: amo.id, code: "200068500" })) });

    expect(await resoudreAmoDuTerritoire(CAMBRAI)).toMatchObject({ statut: "plusieurs" });
  });

  it("n'accepte qu'une AMO proposée pour le territoire", async () => {
    mockBase({ epcis: [{ id: HABITAT.id, code: "200068500" }] });
    expect(await amoCouvreTerritoire(HABITAT.id, CAMBRAI)).toBe(true);

    // Argiles du Nord déclare le Nord, mais l'EPCI a son AMO : le département ne suffit plus.
    mockBase({ epcis: [{ id: HABITAT.id, code: "200068500" }] });
    expect(await amoCouvreTerritoire(ARGILES.id, CAMBRAI)).toBe(false);
  });
});
