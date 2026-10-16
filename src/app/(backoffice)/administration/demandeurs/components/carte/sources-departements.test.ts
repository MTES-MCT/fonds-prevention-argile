import { describe, expect, it, vi } from "vitest";
import { construireCarteCommunes } from "@/features/backoffice/administration/demandeurs/domain";
import { couchesCliquables, synchroniserSources } from "./sources-departements";

function fausseCarte() {
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  const couches = new Set<string>();
  return {
    sources,
    couches,
    getSource: vi.fn((id: string) => sources.get(id)),
    addSource: vi.fn((id: string) => sources.set(id, { setData: vi.fn() })),
    removeSource: vi.fn((id: string) => sources.delete(id)),
    getLayer: vi.fn((id: string) => (couches.has(id) ? { id } : undefined)),
    addLayer: vi.fn((couche: { id: string }) => couches.add(couche.id)),
    removeLayer: vi.fn((id: string) => couches.delete(id)),
  };
}

const CENTRES = { "24322": [0.72, 45.18], "47001": [0.62, 44.2], "81004": [2.15, 43.93] } as Record<
  string,
  [number, number]
>;

function carte(codes: string[]) {
  return construireCarteCommunes(
    codes.map((code) => ({ code, nom: code, demandeurs: 1 })),
    CENTRES
  );
}

describe("synchroniserSources", () => {
  it("pose une source et ses quatre couches par département", () => {
    const map = fausseCarte();
    const actives = new Set<string>();

    synchroniserSources(map as never, carte(["24322", "47001"]), actives);

    expect([...actives]).toEqual(["demandeurs-24", "demandeurs-47"]);
    expect(map.couches.size).toBe(8);
    expect(couchesCliquables(actives)).toEqual([
      "demandeurs-24-groupes",
      "demandeurs-24-communes",
      "demandeurs-47-groupes",
      "demandeurs-47-communes",
    ]);
  });

  it("met à jour les départements restants et retire ceux sortis du filtre", () => {
    const map = fausseCarte();
    const actives = new Set<string>();
    synchroniserSources(map as never, carte(["24322", "47001"]), actives);

    synchroniserSources(map as never, carte(["24322", "81004"]), actives);

    expect([...actives].sort()).toEqual(["demandeurs-24", "demandeurs-81"]);
    expect(map.sources.has("demandeurs-47")).toBe(false);
    expect([...map.couches].some((id) => id.startsWith("demandeurs-47"))).toBe(false);
    expect(map.sources.get("demandeurs-24")?.setData).toHaveBeenCalledTimes(1);
  });
});
