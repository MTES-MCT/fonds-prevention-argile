import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const SECRET = "secret-cron-de-plus-de-trente-deux-caracteres";

vi.mock("@/shared/config/env.config", () => ({ getServerEnv: () => ({ CRON_SECRET: SECRET }) }));
vi.mock("@/features/seo/catnat/services/catnat.service", () => ({ catnatService: { importerCocon: vi.fn() } }));
vi.mock("@/features/seo/catnat/services/decisions-catnat.service", () => ({
  decisionsCatnatService: { importerCocon: vi.fn() },
}));
// `after` n'existe que dans une requête servie par Next : on capture la tâche pour la dérouler à la main.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));

import { after } from "next/server";
import { catnatService } from "@/features/seo/catnat/services/catnat.service";
import { decisionsCatnatService } from "@/features/seo/catnat/services/decisions-catnat.service";
import { POST } from "./route";

function requete(authorization?: string) {
  return new NextRequest("http://localhost/api/cron/import-catnat", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

const bilan = {
  totalCommunes: 1650,
  communesProcessed: 1650,
  communesSuccess: 1650,
  communesFailed: 0,
  totalCatnat: 19129,
  catnatImported: 7033,
  catnatSkipped: 12096,
  errors: [],
  lignesAjoutees: 12,
};

const bilanDecisions = { lues: 4451, retenues: 704, nonReconnues: 497, ecartees: 0, ajoutees: 3, retirees: 0 };

async function derouterTacheArmee() {
  const tache = vi.mocked(after).mock.calls[0][0] as () => Promise<void>;
  await tache();
}

describe("POST /api/cron/import-catnat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(catnatService.importerCocon).mockResolvedValue(bilan);
    vi.mocked(decisionsCatnatService.importerCocon).mockResolvedValue(bilanDecisions);
  });

  it.each([undefined, "Bearer mauvais-secret", `Basic ${SECRET}`, SECRET, "Bearer "])(
    "en-tête Authorization %s → 401, aucun import armé",
    async (authorization) => {
      const reponse = await POST(requete(authorization));

      expect(reponse.status).toBe(401);
      expect(after).not.toHaveBeenCalled();
      expect(catnatService.importerCocon).not.toHaveBeenCalled();
      expect(decisionsCatnatService.importerCocon).not.toHaveBeenCalled();
    }
  );

  it("bon secret → 202 et import armé en arrière-plan", async () => {
    const reponse = await POST(requete(`Bearer ${SECRET}`));

    expect(reponse.status).toBe(202);
    expect(after).toHaveBeenCalledOnce();
  });

  it("import sans échec → bilan en log simple", async () => {
    vi.mocked(catnatService.importerCocon).mockResolvedValue(bilan);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(requete(`Bearer ${SECRET}`));
    await derouterTacheArmee();

    expect(log).toHaveBeenCalledWith("[CRON import-catnat] communes=1650 echecs=0 lignes=7033 ajoutees=12");
    expect(log).toHaveBeenCalledWith(
      "[CRON import-catnat] decisions lues=4451 retenues=704 ajoutees=3 retirees=0 ecartees=0"
    );
    expect(erreur).not.toHaveBeenCalled();
  });

  it("Géorisques en panne → les décisions data.gouv sont importées quand même", async () => {
    vi.mocked(catnatService.importerCocon).mockRejectedValue(new Error("Géorisques injoignable"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(requete(`Bearer ${SECRET}`));
    await derouterTacheArmee();

    expect(decisionsCatnatService.importerCocon).toHaveBeenCalledOnce();
  });

  it("data.gouv en panne → l'erreur est tracée, l'import Géorisques a déjà abouti", async () => {
    vi.mocked(decisionsCatnatService.importerCocon).mockRejectedValue(new Error("HTTP 503"));
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(requete(`Bearer ${SECRET}`));
    await expect(derouterTacheArmee()).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledWith(expect.stringContaining("communes=1650 echecs=0"));
    expect(erreur).toHaveBeenCalledWith("[CRON import-catnat] Erreur des décisions (background):", expect.any(Error));
  });

  it("lignes illisibles dans le fichier des décisions → bilan en erreur", async () => {
    vi.mocked(decisionsCatnatService.importerCocon).mockResolvedValue({ ...bilanDecisions, ecartees: 4 });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(requete(`Bearer ${SECRET}`));
    await derouterTacheArmee();

    expect(erreur).toHaveBeenCalledWith(
      expect.stringContaining("decisions lues=4451 retenues=704 ajoutees=3 retirees=0 ecartees=4")
    );
  });

  it("un lot en échec → bilan en erreur, avec la première cause", async () => {
    vi.mocked(catnatService.importerCocon).mockResolvedValue({
      ...bilan,
      communesFailed: 10,
      errors: [{ codeInsee: "36044", error: "Réponse Géorisques incomplète" }],
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(requete(`Bearer ${SECRET}`));
    await derouterTacheArmee();

    expect(erreur).toHaveBeenCalledWith(expect.stringContaining('echecs=10 lignes=7033 ajoutees=12 erreur="Réponse'));
  });

  it("import qui lève → erreur tracée, sans faire tomber la tâche", async () => {
    vi.mocked(catnatService.importerCocon).mockRejectedValue(new Error("base injoignable"));
    vi.spyOn(console, "log").mockImplementation(() => {});
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(requete(`Bearer ${SECRET}`));
    await expect(derouterTacheArmee()).resolves.toBeUndefined();

    expect(erreur).toHaveBeenCalledWith("[CRON import-catnat] Erreur (background):", expect.any(Error));
  });
});
