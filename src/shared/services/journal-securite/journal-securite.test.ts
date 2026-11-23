import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const enTetes = vi.hoisted(() => ({ lire: vi.fn<() => Promise<Headers>>() }));
vi.mock("next/headers", () => ({ headers: () => enTetes.lire() }));

import { EVENEMENTS_SECURITE, journaliser } from "./journal-securite";

const AGENT = "3f2b1c9e-6d0a-4c1b-9a53-1f0d7a2f4e11";

function derniereLigne(sortie: ReturnType<typeof vi.spyOn>): Record<string, unknown> {
  const [ligne] = sortie.mock.calls.at(-1) as [string];
  return JSON.parse(ligne) as Record<string, unknown>;
}

describe("journaliser", () => {
  let sortie: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-23T09:30:00.000Z"));
    sortie = vi.spyOn(console, "log").mockImplementation(() => {});
    enTetes.lire.mockResolvedValue(new Headers({ "x-real-ip": "203.0.113.7" }));
  });
  afterEach(() => {
    vi.useRealTimers();
    sortie.mockRestore();
  });

  it("écrit une seule ligne JSON, datée, avec l'acteur, la cible et l'adresse de la requête", async () => {
    await journaliser({
      evenement: "agent_cree",
      acteur: { type: "agent", id: AGENT, role: "super_administrateur" },
      cible: { type: "agent", id: "cible-1" },
      details: { compte: "plateforme", role: "analyste" },
    });

    expect(sortie).toHaveBeenCalledOnce();
    const [ligne] = sortie.mock.calls[0] as [string];
    expect(ligne).not.toContain("\n");
    expect(JSON.parse(ligne)).toEqual({
      journal: "securite",
      v: 1,
      date: "2026-11-23T09:30:00.000Z",
      evenement: "agent_cree",
      resultat: "succes",
      acteur: { type: "agent", id: AGENT, role: "super_administrateur" },
      cible: { type: "agent", id: "cible-1" },
      details: { compte: "plateforme", role: "analyste" },
      ip: "203.0.113.7",
    });
  });

  it("garde le résultat et le motif d'un refus, sans clé vide", async () => {
    await journaliser({
      evenement: "connexion_agent",
      resultat: "refus",
      acteur: { type: "anonyme" },
      motif: "double_authentification_absente",
    });

    const ligne = derniereLigne(sortie);
    expect(ligne).toMatchObject({ resultat: "refus", motif: "double_authentification_absente" });
    expect(ligne).not.toHaveProperty("cible");
    expect(ligne).not.toHaveProperty("details");
  });

  it("préfère l'adresse fournie à celle des en-têtes", async () => {
    await journaliser({ evenement: "debit_depasse", acteur: { type: "anonyme" }, ip: "198.51.100.4" });

    expect(derniereLigne(sortie).ip).toBe("198.51.100.4");
    expect(enTetes.lire).not.toHaveBeenCalled();
  });

  it("hors d'une requête, l'adresse est inconnue et l'évènement reste écrit", async () => {
    enTetes.lire.mockRejectedValue(new Error("headers was called outside a request scope"));

    await journaliser({ evenement: "synchronisation_lancee", acteur: { type: "systeme", id: "cron" } });

    expect(derniereLigne(sortie)).toMatchObject({ evenement: "synchronisation_lancee", ip: "inconnue" });
  });

  it("laisse remonter le signal d'usage dynamique de Next au lieu de l'avaler", async () => {
    enTetes.lire.mockRejectedValue(Object.assign(new Error("dynamique"), { digest: "DYNAMIC_SERVER_USAGE" }));

    await expect(journaliser({ evenement: "connexion_agent", acteur: { type: "anonyme" } })).rejects.toThrow(
      "dynamique"
    );
  });

  it("masque un email et tronque un texte long passés par erreur", async () => {
    await journaliser({
      evenement: "agent_modifie",
      acteur: { type: "agent", id: AGENT },
      cible: { type: "dossier_dn", id: "jean.dupont@example.org" },
      motif: "x".repeat(400),
      details: { email: "jean.dupont@example.org", note: "y".repeat(400), nombre: 3, absent: undefined },
    });

    const [ligne] = sortie.mock.calls[0] as [string];
    expect(ligne).not.toContain("example.org");
    const lue = JSON.parse(ligne) as { cible: { id: string }; motif: string; details: Record<string, unknown> };
    expect(lue.cible.id).toBe("[masque]");
    expect(lue.motif).toHaveLength(120);
    expect(lue.details).toEqual({ email: "[masque]", note: "y".repeat(120), nombre: 3 });
  });

  it("n'écrit pas une adresse qui n'a pas la forme d'une adresse", async () => {
    await journaliser({ evenement: "acces_refuse", acteur: { type: "anonyme" }, ip: "Jean Dupont 0612345678" });
    expect(derniereLigne(sortie).ip).toBe("inconnue");

    await journaliser({ evenement: "acces_refuse", acteur: { type: "anonyme" }, ip: "2001:db8::7" });
    expect(derniereLigne(sortie).ip).toBe("2001:db8::7");
  });

  it("le filet couvre aussi l'acteur, et écarte un détail qui n'est ni texte, ni nombre, ni booléen", async () => {
    await journaliser({
      evenement: "agent_modifie",
      acteur: { type: "agent", id: "jean.dupont@example.org", role: "r".repeat(400) },
      details: { code: {} as never, rappel: (() => "x") as never, nul: null, vrai: true },
    });

    const lue = derniereLigne(sortie) as { acteur: Record<string, string>; details: Record<string, unknown> };
    expect(lue.acteur).toEqual({ type: "agent", id: "[masque]", role: "r".repeat(120) });
    expect(lue.details).toEqual({ nul: null, vrai: true });
  });

  it("un retour à la ligne dans une valeur ne coupe pas la ligne du journal", async () => {
    await journaliser({
      evenement: "observation_dn_resolue",
      acteur: { type: "agent", id: AGENT },
      cible: { type: "dossier_dn", id: '123\n{"journal":"securite","evenement":"agent_cree"}' },
    });

    const [ligne] = sortie.mock.calls[0] as [string];
    expect(ligne.split("\n")).toHaveLength(1);
  });

  it("n'échoue pas quand l'écriture est impossible", async () => {
    const erreurs = vi.spyOn(console, "error").mockImplementation(() => {});
    sortie.mockImplementation(() => {
      throw new Error("sortie fermée");
    });

    await expect(journaliser({ evenement: "agent_supprime", acteur: { type: "agent", id: AGENT } })).resolves.toBe(
      undefined
    );
    expect(erreurs).toHaveBeenCalledWith("[journal-securite] écriture impossible (agent_supprime)");
    erreurs.mockRestore();
  });

  it("n'a pas deux évènements du même nom", () => {
    expect(new Set(EVENEMENTS_SECURITE).size).toBe(EVENEMENTS_SECURITE.length);
  });
});
