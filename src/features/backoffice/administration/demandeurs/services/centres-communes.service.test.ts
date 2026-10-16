import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => async () => JSON.parse(JSON.stringify(await fn())),
}));

const fetchCentres = vi.hoisted(() => vi.fn());
vi.mock("@/shared/adapters/geo", () => ({ fetchCentresCommunesDepartement: fetchCentres }));

import { getCentresCommunes } from "./centres-communes.service";

describe("getCentresCommunes", () => {
  beforeEach(() => fetchCentres.mockReset());

  it("interroge chaque département une fois et ne renvoie que les communes demandées", async () => {
    fetchCentres.mockImplementation(async (dep: string) =>
      dep === "03"
        ? [
            { code: "03185", lon: 2.6, lat: 46.34 },
            { code: "03190", lon: 3.33, lat: 46.56 },
          ]
        : [{ code: "97411", lon: 55.45, lat: -20.88 }]
    );

    const resultat = await getCentresCommunes(["03185", "03185", "97411"]);

    expect(fetchCentres).toHaveBeenCalledTimes(2);
    expect(fetchCentres).toHaveBeenCalledWith("03");
    expect(fetchCentres).toHaveBeenCalledWith("974");
    expect(resultat).toEqual({
      centres: { "03185": [2.6, 46.34], "97411": [55.45, -20.88] },
      departementsEnEchec: [],
    });
  });

  it("signale un département indisponible sans priver les autres de leurs centres", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchCentres.mockImplementation(async (dep: string) => {
      if (dep === "36") throw new Error("Erreur API Geo: 503");
      return [{ code: "03185", lon: 2.6, lat: 46.34 }];
    });

    const resultat = await getCentresCommunes(["03185", "36044"]);

    expect(resultat).toEqual({ centres: { "03185": [2.6, 46.34] }, departementsEnEchec: ["36"] });
  });
});
