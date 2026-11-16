// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerEnv } from "@/shared/config/env.config";
import { demarrerReleveMemoire } from "./releve-memoire.service";

vi.mock("@/shared/config/env.config", () => ({ getServerEnv: vi.fn() }));

type EnvServeur = ReturnType<typeof getServerEnv>;
const poserEnv = (env: Partial<EnvServeur>) => vi.mocked(getServerEnv).mockReturnValue(env as EnvServeur);

describe("demarrerReleveMemoire", () => {
  let lignes: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    lignes = [];
    vi.spyOn(console, "log").mockImplementation((ligne: unknown) => {
      lignes.push(String(ligne));
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const lignesMemoire = () => lignes.filter((ligne) => ligne.startsWith("[memoire]"));

  it("ne programme rien sans MEMORY_LOG_INTERVAL_MINUTES", async () => {
    poserEnv({});

    await demarrerReleveMemoire();

    expect(vi.getTimerCount()).toBe(0);
    expect(lignes).toEqual([]);
  });

  it("ne fait pas échouer le démarrage quand l'environnement est invalide", async () => {
    vi.mocked(getServerEnv).mockImplementation(() => {
      throw new Error("Invalid server environment variables");
    });

    await expect(demarrerReleveMemoire()).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("écrit un premier relevé après une minute, puis un par intervalle", async () => {
    poserEnv({ MEMORY_LOG_INTERVAL_MINUTES: 10 });

    await demarrerReleveMemoire();
    expect(lignesMemoire()).toEqual(["[memoire] relevé toutes les 10 min, sans sites d'allocation"]);

    await vi.advanceTimersByTimeAsync(60_000);
    await vi.waitFor(() => expect(lignesMemoire()).toHaveLength(2));
    expect(lignesMemoire()[1]).toMatch(/^\[memoire\] actif=\d+min .*processus rss=\d+ tas=\d+\/\d+ /);

    await vi.advanceTimersByTimeAsync(9 * 60_000);
    await vi.waitFor(() => expect(lignesMemoire()).toHaveLength(3));
  });

  it("ajoute les sites d'allocation quand MEMORY_LOG_TOP_ALLOCATIONS est posée", async () => {
    poserEnv({ MEMORY_LOG_INTERVAL_MINUTES: 10, MEMORY_LOG_TOP_ALLOCATIONS: 3 });

    await demarrerReleveMemoire();
    await vi.advanceTimersByTimeAsync(60_000);

    await vi.waitFor(() =>
      expect(lignesMemoire().some((l) => l.startsWith("[memoire] allocations vivantes échantillonnées"))).toBe(true)
    );
    expect(lignesMemoire()[0]).toBe("[memoire] relevé toutes les 10 min, 3 premiers sites d'allocation");
    expect(lignesMemoire().filter((l) => l.startsWith("[memoire] alloc ")).length).toBeLessThanOrEqual(3);
  });
});
