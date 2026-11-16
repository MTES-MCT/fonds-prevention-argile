import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AttenteDepassee, appelerAvecPatience, reinitialiserAppelsPatients } from "./appel-patient";

const OPTIONS = { attenteMs: 4_000, fraicheurMs: 3_600_000 };

/** Appel dont le test décide de l'issue et du moment. */
function appelControle<T>() {
  let resoudre!: (valeur: T) => void;
  let rejeter!: (erreur: Error) => void;
  const promesse = new Promise<T>((res, rej) => {
    resoudre = res;
    rejeter = rej;
  });
  return { lancer: vi.fn(() => promesse), resoudre, rejeter };
}

describe("appelerAvecPatience", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reinitialiserAppelsPatients();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rend le résultat d'un appel qui répond dans le temps d'attente", async () => {
    const appel = appelControle<number>();

    const demande = appelerAvecPatience("cle", appel.lancer, OPTIONS);
    appel.resoudre(42);

    await expect(demande).resolves.toBe(42);
  });

  it("rend le résultat gardé sans relancer l'appel tant qu'il est frais", async () => {
    const lancer = vi.fn().mockResolvedValue(42);
    await appelerAvecPatience("cle", lancer, OPTIONS);

    await vi.advanceTimersByTimeAsync(OPTIONS.fraicheurMs - 1);

    await expect(appelerAvecPatience("cle", lancer, OPTIONS)).resolves.toBe(42);
    expect(lancer).toHaveBeenCalledTimes(1);
  });

  it("partage un seul appel entre deux demandes simultanées", async () => {
    const appel = appelControle<number>();

    const demandes = [
      appelerAvecPatience("cle", appel.lancer, OPTIONS),
      appelerAvecPatience("cle", appel.lancer, OPTIONS),
    ];
    appel.resoudre(42);

    await expect(Promise.all(demandes)).resolves.toEqual([42, 42]);
    expect(appel.lancer).toHaveBeenCalledTimes(1);
  });

  it("ne partage pas deux clés différentes", async () => {
    const lancer = vi.fn().mockResolvedValue(42);

    await Promise.all([appelerAvecPatience("a", lancer, OPTIONS), appelerAvecPatience("b", lancer, OPTIONS)]);

    expect(lancer).toHaveBeenCalledTimes(2);
  });

  it("rend la main après le temps d'attente, sans interrompre l'appel", async () => {
    const appel = appelControle<number>();

    const demande = appelerAvecPatience("cle", appel.lancer, OPTIONS);
    const issue = expect(demande).rejects.toBeInstanceOf(AttenteDepassee);
    await vi.advanceTimersByTimeAsync(OPTIONS.attenteMs);
    await issue;

    // L'appel finit plus tard : son résultat sert la demande suivante.
    appel.resoudre(42);
    await vi.advanceTimersByTimeAsync(0);
    await expect(appelerAvecPatience("cle", appel.lancer, OPTIONS)).resolves.toBe(42);
    expect(appel.lancer).toHaveBeenCalledTimes(1);
  });

  it("n'attend pas une seconde fois un appel qui a déjà dépassé le temps d'attente", async () => {
    const appel = appelControle<number>();
    const premiere = appelerAvecPatience("cle", appel.lancer, OPTIONS);
    const issue = expect(premiere).rejects.toBeInstanceOf(AttenteDepassee);
    await vi.advanceTimersByTimeAsync(OPTIONS.attenteMs);
    await issue;

    // Rejet immédiat : aucun minuteur à avancer.
    await expect(appelerAvecPatience("cle", appel.lancer, OPTIONS)).rejects.toBeInstanceOf(AttenteDepassee);
    expect(appel.lancer).toHaveBeenCalledTimes(1);
  });

  it("ne fait attendre que le temps restant à qui rejoint un appel en cours", async () => {
    const appel = appelControle<number>();
    const premiere = appelerAvecPatience("cle", appel.lancer, OPTIONS);
    premiere.catch(() => {});
    await vi.advanceTimersByTimeAsync(3_000);

    const seconde = appelerAvecPatience("cle", appel.lancer, OPTIONS);
    const issue = expect(seconde).rejects.toBeInstanceOf(AttenteDepassee);
    await vi.advanceTimersByTimeAsync(1_000);

    await issue;
  });

  it("ne garde pas un échec : la demande suivante relance l'appel", async () => {
    const lancer = vi.fn().mockRejectedValueOnce(new Error("panne")).mockResolvedValueOnce(42);

    await expect(appelerAvecPatience("cle", lancer, OPTIONS)).rejects.toThrow("panne");
    await expect(appelerAvecPatience("cle", lancer, OPTIONS)).resolves.toBe(42);
    expect(lancer).toHaveBeenCalledTimes(2);
  });

  it("garde la valeur périmée quand le rafraîchissement échoue, sans rejet non géré", async () => {
    const rejetsNonGeres = vi.fn();
    process.on("unhandledRejection", rejetsNonGeres);
    await appelerAvecPatience("cle", vi.fn().mockResolvedValue(42), OPTIONS);
    await vi.advanceTimersByTimeAsync(OPTIONS.fraicheurMs);
    const rafraichissement = appelControle<number>();

    // Personne n'attend ce rafraîchissement : la valeur périmée est rendue aussitôt.
    await expect(appelerAvecPatience("cle", rafraichissement.lancer, OPTIONS)).resolves.toBe(42);
    rafraichissement.rejeter(new Error("coupure a 60 s"));
    vi.useRealTimers();
    await new Promise((resoudre) => setImmediate(resoudre));

    process.off("unhandledRejection", rejetsNonGeres);
    expect(rejetsNonGeres).not.toHaveBeenCalled();
    await expect(appelerAvecPatience("cle", vi.fn().mockResolvedValue(43), OPTIONS)).resolves.toBe(42);
  });

  it("sert la valeur périmée tout de suite pendant qu'un nouvel appel la remplace", async () => {
    await appelerAvecPatience("cle", vi.fn().mockResolvedValue(42), OPTIONS);
    await vi.advanceTimersByTimeAsync(OPTIONS.fraicheurMs);
    const rafraichissement = appelControle<number>();

    await expect(appelerAvecPatience("cle", rafraichissement.lancer, OPTIONS)).resolves.toBe(42);
    expect(rafraichissement.lancer).toHaveBeenCalledTimes(1);

    rafraichissement.resoudre(43);
    await vi.advanceTimersByTimeAsync(0);
    await expect(appelerAvecPatience("cle", rafraichissement.lancer, OPTIONS)).resolves.toBe(43);
    expect(rafraichissement.lancer).toHaveBeenCalledTimes(1);
  });

  it("ne sert plus une valeur périmée depuis plus d'un jour", async () => {
    await appelerAvecPatience("cle", vi.fn().mockResolvedValue(42), OPTIONS);
    await vi.advanceTimersByTimeAsync(OPTIONS.fraicheurMs + 24 * 3_600_000);
    const appel = appelControle<number>();

    const demande = appelerAvecPatience("cle", appel.lancer, OPTIONS);
    appel.resoudre(43);

    await expect(demande).resolves.toBe(43);
  });
});
