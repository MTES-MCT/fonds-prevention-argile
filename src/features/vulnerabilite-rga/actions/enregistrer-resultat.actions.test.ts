import { describe, it, expect, vi, beforeEach } from "vitest";
import { cookies } from "next/headers";
import { getSession, COOKIE_NAMES, getCookieOptions, SESSION_DURATION } from "@/features/auth/server";
import { vulnerabiliteSimulationsRepo, parcoursRepo } from "@/shared/database/repositories";
import { isVulnerabiliteRgaActive } from "../domain/value-objects/vulnerabilite-disponibilite";
import { toSimulationPayload } from "../domain/value-objects/simulation-payload";
import { enregistrerResultatVulnerabiliteAction } from "./enregistrer-resultat.actions";
import type { PartialVulnerabiliteReponses } from "../domain/types/vulnerabilite-reponses.types";

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
vi.mock("../domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: vi.fn(() => true),
}));

const mockedSession = vi.mocked(getSession);
const mockedCookies = vi.mocked(cookies);
const mockedCreate = vi.mocked(vulnerabiliteSimulationsRepo.create);
const mockedFindByUserId = vi.mocked(parcoursRepo.findByUserId);
const mockedUpdate = vi.mocked(parcoursRepo.update);
const mockedActive = vi.mocked(isVulnerabiliteRgaActive);

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
  eaux: {
    pente_terrain: "vers_facade",
    reseaux_enterres: "sous_fondations",
    gravier_proprete: "present",
    gouttieres: "absentes_ou_debordantes",
  },
  vegetation: {
    arbre_proximite: "oui",
    arbre_essence: "peuplier",
    haies: "proches_denses",
    vegetation_pied_facade: "presente",
  },
  divers: { mitoyennete: "mitoyen_voisin_sans_travaux", ensoleillement: "fort_sud" },
};
const payload = toSimulationPayload(answers);

function mockCookieStore() {
  const set = vi.fn();
  mockedCookies.mockResolvedValue({ set } as never);
  return { set };
}

describe("enregistrerResultatVulnerabiliteAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedActive.mockReturnValue(true);
    mockedCreate.mockResolvedValue({ id: "sim-1" } as never);
  });

  it("pose le pointeur immédiatement si le demandeur est déjà connecté", async () => {
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue({ id: "p1" } as never);
    const { set } = mockCookieStore();

    await enregistrerResultatVulnerabiliteAction(payload);

    expect(mockedUpdate).toHaveBeenCalledWith("p1", { vulnerabiliteSimulationId: "sim-1" });
    expect(set).not.toHaveBeenCalled();
  });

  it("pose un cookie httpOnly si anonyme, sans toucher au parcours", async () => {
    mockedSession.mockResolvedValue(null as never);
    const { set } = mockCookieStore();

    await enregistrerResultatVulnerabiliteAction(payload);

    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith(
      COOKIE_NAMES.VULNERABILITE_SIMULATION_ID,
      "sim-1",
      getCookieOptions(SESSION_DURATION.vulnerabiliteSimulationLink)
    );
  });

  it("recalcule le score côté serveur et n'écrit que les colonnes de la table anonyme", async () => {
    mockedSession.mockResolvedValue(null as never);
    mockCookieStore();

    await enregistrerResultatVulnerabiliteAction(payload);

    const inserted = mockedCreate.mock.calls[0][0];
    expect(inserted.codeDepartement).toBe("36");
    expect(inserted.aleaRga).toBe("fort");
    expect(inserted.penteTerrain).toBe("vers_facade");
    // Toutes les réponses au pire barème : le score recalculé doit être maximal.
    expect(inserted.scoreGlobal).toBe(100);
    expect(JSON.stringify(inserted)).not.toContain("1 rue Test");
    expect(JSON.stringify(inserted)).not.toContain("clef-test");
  });

  it("ignore un score falsifié envoyé par le client", async () => {
    mockedSession.mockResolvedValue(null as never);
    mockCookieStore();

    await enregistrerResultatVulnerabiliteAction({ ...payload, scoreGlobal: 0, scoreParCategorie: { sol: 0 } });

    expect(mockedCreate.mock.calls[0][0].scoreGlobal).toBe(100);
  });

  it("rejette une charge utile hors barème sans rien écrire", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await enregistrerResultatVulnerabiliteAction({
      codeDepartement: "36",
      reponses: { pente_terrain: "valeur_injectee" },
    });

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("rejette une charge utile qui n'est pas un objet attendu", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await enregistrerResultatVulnerabiliteAction("nimporte quoi");

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("n'écrit rien quand le simulateur est inactif (production)", async () => {
    mockedActive.mockReturnValue(false);

    await enregistrerResultatVulnerabiliteAction(payload);

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("ne bloque jamais (best-effort) si l'écriture échoue", async () => {
    mockedSession.mockResolvedValue(null as never);
    mockCookieStore();
    mockedCreate.mockRejectedValue(new Error("DB down"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(enregistrerResultatVulnerabiliteAction(payload)).resolves.toBeUndefined();
  });

  it("connecté mais sans parcours : n'écrit rien et ne plante pas", async () => {
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue(null);
    mockCookieStore();

    await enregistrerResultatVulnerabiliteAction(payload);

    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});
