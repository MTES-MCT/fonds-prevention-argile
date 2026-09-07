import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import { COOKIE_NAMES } from "../../domain/value-objects";
import { parcoursRepo, vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import { lierSimulationVulnerabiliteAnonyme } from "./franceconnect.service";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  userRepo: {},
  parcoursRepo: { update: vi.fn() },
  vulnerabiliteSimulationsRepo: { findById: vi.fn() },
}));

const mockedCookies = vi.mocked(cookies);
const mockedUpdate = vi.mocked(parcoursRepo.update);
const mockedFindSimulationById = vi.mocked(vulnerabiliteSimulationsRepo.findById);

function mockCookieStore(value?: string) {
  const get = vi.fn().mockReturnValue(value !== undefined ? { value } : undefined);
  const del = vi.fn();
  mockedCookies.mockResolvedValue({ get, delete: del } as never);
  return { get, delete: del };
}

describe("lierSimulationVulnerabiliteAnonyme", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no-op silencieux si pas de cookie en attente", async () => {
    mockCookieStore(undefined);

    await lierSimulationVulnerabiliteAnonyme("p1");

    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("supprime le cookie et pose le pointeur si tout est valide", async () => {
    const store = mockCookieStore("sim-1");
    mockedFindSimulationById.mockResolvedValue({ id: "sim-1" } as never);

    await lierSimulationVulnerabiliteAnonyme("p1");

    expect(store.delete).toHaveBeenCalledWith(COOKIE_NAMES.VULNERABILITE_SIMULATION_ID);
    expect(mockedUpdate).toHaveBeenCalledWith("p1", { vulnerabiliteSimulationId: "sim-1" });
  });

  it("no-op silencieux si l'id en cookie ne correspond à aucune simulation (périmé/invalide)", async () => {
    mockCookieStore("sim-inconnu");
    mockedFindSimulationById.mockResolvedValue(null);

    await lierSimulationVulnerabiliteAnonyme("p1");

    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("best-effort : une erreur ne doit pas se propager", async () => {
    mockCookieStore("sim-1");
    mockedFindSimulationById.mockRejectedValue(new Error("db down"));

    await expect(lierSimulationVulnerabiliteAnonyme("p1")).resolves.toBeUndefined();
  });
});
