import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import { getSession, COOKIE_NAMES, getCookieOptions, SESSION_DURATION } from "@/features/auth/server";
import { vulnerabiliteSimulationsRepo, parcoursRepo } from "@/shared/database/repositories";
import { enregistrerResultatVulnerabiliteAction } from "./enregistrer-resultat.actions";
import type { PartialVulnerabiliteReponses } from "../domain/types/vulnerabilite-reponses.types";
import type { VulnerabiliteScoreResult } from "../domain/services/scoring.service";

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/features/auth/server", () => ({
  getSession: vi.fn(),
  COOKIE_NAMES: { VULNERABILITE_SIMULATION_ID: "vulnerabilite_simulation_id" },
  getCookieOptions: vi.fn((maxAge?: number) => ({ httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge })),
  SESSION_DURATION: { vulnerabiliteSimulationLink: 3600 },
}));
vi.mock("@/shared/database/repositories", () => ({
  vulnerabiliteSimulationsRepo: { create: vi.fn() },
  parcoursRepo: { findByUserId: vi.fn(), update: vi.fn() },
}));

const mockedSession = vi.mocked(getSession);
const mockedCookies = vi.mocked(cookies);
const mockedCreate = vi.mocked(vulnerabiliteSimulationsRepo.create);
const mockedFindByUserId = vi.mocked(parcoursRepo.findByUserId);
const mockedUpdate = vi.mocked(parcoursRepo.update);

const answers: PartialVulnerabiliteReponses = {
  adresse: {
    label: "1 rue Test, 36000 Châteauroux",
    communeNom: "Châteauroux",
    codeDepartement: "36",
    coordonnees: "1.5,46.8",
    clefBan: "clef-test",
    rnb: null,
    aleaRga: "fort",
  },
};
const scoreResult: VulnerabiliteScoreResult = {
  scoreGlobal: 42,
  scoreParCategorie: { sol: 100, eaux: 30, vegetation: null, divers: 20 },
  details: [],
};

function mockCookieStore() {
  const set = vi.fn();
  mockedCookies.mockResolvedValue({ set } as never);
  return { set };
}

describe("enregistrerResultatVulnerabiliteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreate.mockResolvedValue({ id: "sim-1" } as never);
  });

  it("pose le pointeur immédiatement si le demandeur est déjà connecté", async () => {
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue({ id: "p1" } as never);
    const { set } = mockCookieStore();

    await enregistrerResultatVulnerabiliteAction(answers, scoreResult);

    expect(mockedUpdate).toHaveBeenCalledWith("p1", { vulnerabiliteSimulationId: "sim-1" });
    expect(set).not.toHaveBeenCalled();
  });

  it("pose un cookie httpOnly si anonyme, sans toucher au parcours", async () => {
    mockedSession.mockResolvedValue(null as never);
    const { set } = mockCookieStore();

    await enregistrerResultatVulnerabiliteAction(answers, scoreResult);

    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      COOKIE_NAMES.VULNERABILITE_SIMULATION_ID,
      "sim-1",
      getCookieOptions(SESSION_DURATION.vulnerabiliteSimulationLink)
    );
  });

  it("ne bloque jamais (best-effort) si l'écriture échoue", async () => {
    mockedCreate.mockRejectedValue(new Error("DB down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(enregistrerResultatVulnerabiliteAction(answers, scoreResult)).resolves.toBeUndefined();
  });

  it("connecté mais sans parcours : n'écrit rien et ne plante pas", async () => {
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue(null);
    mockCookieStore();

    await enregistrerResultatVulnerabiliteAction(answers, scoreResult);

    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
