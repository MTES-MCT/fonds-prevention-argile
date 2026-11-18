import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/shared/services/rga", () => ({ getAleaByCoordinates: vi.fn(async () => "fort") }));

import { getAleaByCoordinates } from "@/shared/services/rga";
import { DEBITS, reinitialiserDebits } from "@/shared/services/limitation-debit/limitation-debit";
import { GET } from "./route";

const appeler = (query: string) => GET(new NextRequest(`http://localhost/api/rga/alea${query}`));

describe("GET /api/rga/alea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reinitialiserDebits();
  });

  it("coordonnées valides → niveau d'aléa", async () => {
    const reponse = await appeler("?lat=46.81&lon=1.69");

    expect(await reponse.json()).toEqual({ alea: "fort" });
    expect(getAleaByCoordinates).toHaveBeenCalledWith(46.81, 1.69);
  });

  // Route publique qui interroge PostGIS : rien d'autre que deux nombres plausibles n'atteint la base.
  it.each([
    ["aucun paramètre", ""],
    ["longitude absente", "?lat=46.81"],
    ["texte", "?lat=abc&lon=1.69"],
    ["nombre suivi de texte", "?lat=46.81;DROP&lon=1.69"],
    ["infini", "?lat=Infinity&lon=1.69"],
    ["latitude hors du globe", "?lat=91&lon=1.69"],
    ["longitude hors du globe", "?lat=46.81&lon=-181"],
  ])("%s → 400, aucune requête en base", async (_cas, query) => {
    const reponse = await appeler(query);

    expect(reponse.status).toBe(400);
    expect(getAleaByCoordinates).not.toHaveBeenCalled();
  });

  it("au-delà du plafond de lecture → 429 avec le délai d'attente, sans requête en base", async () => {
    for (let i = 0; i < DEBITS.lecture.max; i++) await appeler("?lat=46.81&lon=1.69");
    vi.mocked(getAleaByCoordinates).mockClear();

    const reponse = await appeler("?lat=46.81&lon=1.69");

    expect(reponse.status).toBe(429);
    expect(reponse.headers.get("retry-after")).toBeTruthy();
    expect(getAleaByCoordinates).not.toHaveBeenCalled();
  });
});
