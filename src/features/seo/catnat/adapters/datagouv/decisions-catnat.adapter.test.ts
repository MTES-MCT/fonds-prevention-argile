import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDecisionsSecheresse, lireDecisionsSecheresse } from "./decisions-catnat.adapter";

const ENTETES =
  "date_arrete,date_publication,code_departement,departement,code_insee,commune,phenomene,date_debut,date_fin,decision,motif,motivation_officielle,nb_reconnaissances_5ans,page_arrete";
const SECHERESSE = "Mouvements de terrain différentiels consécutifs à la sécheresse et à la réhydratation des sols";

const ligne = (champs: Partial<Record<string, string>> = {}) => {
  const valeurs: Record<string, string> = {
    date_arrete: "2026-05-11",
    date_publication: "2026-05-14",
    code_departement: "36",
    departement: "Indre",
    code_insee: "36044",
    commune: "Châteauroux",
    phenomene: SECHERESSE,
    date_debut: "2025-01-01",
    date_fin: "2025-12-31",
    decision: "refusée",
    motif: "critère météorologique non satisfait",
    motivation_officielle: '"Critère non satisfait, selon la circulaire."',
    nb_reconnaissances_5ans: "",
    page_arrete: "https://exemple.test/arrete",
    ...champs,
  };
  return ENTETES.split(",")
    .map((colonne) => valeurs[colonne])
    .join(",");
};

const csv = (...lignes: string[]) => [ENTETES, ...lignes].join("\n");

describe("lireDecisionsSecheresse", () => {
  it("traduit un refus, avec son motif", () => {
    expect(lireDecisionsSecheresse(csv(ligne())).decisions).toEqual([
      {
        codeInsee: "36044",
        libelleCommune: "Châteauroux",
        dateArrete: "2026-05-11",
        datePublicationJo: "2026-05-14",
        dateDebutEvt: "2025-01-01",
        dateFinEvt: "2025-12-31",
        decision: "non_reconnue",
        motif: "critère météorologique non satisfait",
        source: "data.gouv",
      },
    ]);
  });

  it("une reconnaissance n'a pas de motif", () => {
    const [decision] = lireDecisionsSecheresse(csv(ligne({ decision: "reconnue", motif: "" }))).decisions;

    expect(decision).toMatchObject({ decision: "reconnue", motif: null });
  });

  it("ne garde ni les inondations ni les mouvements de terrain « hors sécheresse »", () => {
    const { decisions, ecartees } = lireDecisionsSecheresse(
      csv(
        ligne({ phenomene: "Inondations et coulées de boue" }),
        ligne({ phenomene: "Mouvements de terrains (hors sécheresse géotechnique)" }),
        ligne({ code_insee: "54395" })
      )
    );

    expect(decisions.map((decision) => decision.codeInsee)).toEqual(["54395"]);
    expect(ecartees).toBe(0);
  });

  it.each([
    ["date illisible", { date_debut: "01/01/2025" }],
    ["code INSEE illisible", { code_insee: "3604" }],
    ["décision inconnue", { decision: "ajournée" }],
  ])("%s → ligne écartée et comptée, les autres gardées", (_cas, champs) => {
    const { decisions, ecartees } = lireDecisionsSecheresse(csv(ligne(champs), ligne({ code_insee: "2A004" })));

    expect(decisions.map((decision) => decision.codeInsee)).toEqual(["2A004"]);
    expect(ecartees).toBe(1);
  });

  it("guillemet non refermé dans un motif → erreur, les décisions suivantes ne passent pas pour disparues", () => {
    const tronque = csv(
      ligne({ motivation_officielle: '"motivation jamais refermée' }),
      ligne({ code_insee: "54395" })
    );

    expect(() => lireDecisionsSecheresse(tronque)).toThrow(/CSV mal formé/);
  });

  it("colonne absente du fichier → erreur, plutôt qu'un import vide", () => {
    expect(() => lireDecisionsSecheresse("date_arrete,commune\n2026-05-11,Châteauroux")).toThrow(/colonnes absentes/);
  });
});

describe("fetchDecisionsSecheresse", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("télécharge la ressource data.gouv et lit ses décisions", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, text: async () => csv(ligne()) } as Response);

    const { decisions } = await fetchDecisionsSecheresse();

    expect(decisions).toHaveLength(1);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toMatch(/^https:\/\/www\.data\.gouv\.fr\/api\/1\/datasets\/r\//);
  });

  it("réponse en erreur → erreur, rien n'est lu", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as Response);

    await expect(fetchDecisionsSecheresse()).rejects.toThrow("HTTP 503");
  });
});
