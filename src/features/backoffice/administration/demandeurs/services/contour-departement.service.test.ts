import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown) => async () => JSON.parse(JSON.stringify(await fn())),
}));

const allier = {
  type: "Polygon",
  coordinates: [
    [
      [2.2, 46.2],
      [3.9, 46.2],
      [3.0, 46.8],
      [2.2, 46.2],
    ],
  ],
};
vi.mock("@/shared/adapters/geo", () => ({ fetchContoursDepartements: vi.fn(async () => ({ "03": allier })) }));

import { getContourDepartement } from "./contour-departement.service";

describe("getContourDepartement", () => {
  it("retrouve le contour depuis le code sans zéro de tête du filtre", async () => {
    expect(await getContourDepartement("3")).toEqual(allier);
  });

  it("renvoie null pour un département absent du référentiel", async () => {
    expect(await getContourDepartement("99")).toBeNull();
  });
});
