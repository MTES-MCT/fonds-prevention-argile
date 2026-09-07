import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import { getSession, COOKIE_NAMES } from "@/features/auth/server";
import { parcoursRepo, vulnerabiliteSimulationsRepo } from "@/shared/database/repositories";
import { lierSimulationVulnerabiliteAuCompte } from "./parcours-vulnerabilite-link.actions";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/features/auth/server", () => ({
  getSession: vi.fn(),
  COOKIE_NAMES: { VULNERABILITE_SIMULATION_ID: "vulnerabilite_simulation_id" },
}));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findByUserId: vi.fn(), update: vi.fn() },
  vulnerabiliteSimulationsRepo: { findById: vi.fn() },
}));

const mockedSession = vi.mocked(getSession);
const mockedCookies = vi.mocked(cookies);
const mockedFindByUserId = vi.mocked(parcoursRepo.findByUserId);
const mockedUpdate = vi.mocked(parcoursRepo.update);
const mockedFindSimulationById = vi.mocked(vulnerabiliteSimulationsRepo.findById);

function mockCookieStore(value?: string) {
  const get = vi.fn().mockReturnValue(value !== undefined ? { value } : undefined);
  const del = vi.fn();
  mockedCookies.mockResolvedValue({ get, delete: del } as never);
  return { get, delete: del };
}

describe("lierSimulationVulnerabiliteAuCompte", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no-op silencieux si pas de session", async () => {
    mockedSession.mockResolvedValue(null as never);
    mockCookieStore("sim-1");

    const result = await lierSimulationVulnerabiliteAuCompte();

    expect(result.success).toBe(true);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("no-op silencieux si pas de cookie en attente", async () => {
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockCookieStore(undefined);

    const result = await lierSimulationVulnerabiliteAuCompte();

    expect(result.success).toBe(true);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("supprime le cookie et pose le pointeur si tout est valide", async () => {
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    const store = mockCookieStore("sim-1");
    mockedFindSimulationById.mockResolvedValue({ id: "sim-1" } as never);
    mockedFindByUserId.mockResolvedValue({ id: "p1" } as never);

    const result = await lierSimulationVulnerabiliteAuCompte();

    expect(result.success).toBe(true);
    expect(store.delete).toHaveBeenCalledWith(COOKIE_NAMES.VULNERABILITE_SIMULATION_ID);
    expect(mockedUpdate).toHaveBeenCalledWith("p1", { vulnerabiliteSimulationId: "sim-1" });
  });

  it("no-op silencieux si l'id en cookie ne correspond à aucune simulation (périmé/invalide)", async () => {
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockCookieStore("sim-inconnu");
    mockedFindSimulationById.mockResolvedValue(null);

    const result = await lierSimulationVulnerabiliteAuCompte();

    expect(result.success).toBe(true);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("échoue si le parcours de l'utilisateur connecté n'existe pas", async () => {
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockCookieStore("sim-1");
    mockedFindSimulationById.mockResolvedValue({ id: "sim-1" } as never);
    mockedFindByUserId.mockResolvedValue(null);

    const result = await lierSimulationVulnerabiliteAuCompte();

    expect(result.success).toBe(false);
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
