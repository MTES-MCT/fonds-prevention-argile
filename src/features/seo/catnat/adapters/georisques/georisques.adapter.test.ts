import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCatnatByCodeInsee, fetchCatnatByCodesInsee } from "./georisques.adapter";
import type { ApiGeorisquesCatnat } from "./georisques.types";

const ligne = (code: string, codeInsee = "36044"): ApiGeorisquesCatnat => ({
  code_national_catnat: code,
  date_debut_evt: "01/07/2022",
  date_fin_evt: "30/09/2022",
  date_publication_arrete: "25/04/2023",
  date_publication_jo: "03/05/2023",
  libelle_risque_jo: "Sécheresse",
  code_insee: codeInsee,
  libelle_commune: "Châteauroux",
});

function reponse(data: ApiGeorisquesCatnat[], results: number, totalPages = 1) {
  return { ok: true, json: async () => ({ results, page: 1, total_pages: totalPages, data }) } as Response;
}

const appels = () => vi.mocked(fetch).mock.calls.map(([url]) => new URL(String(url)).searchParams);

describe("adaptateur Géorisques — un résultat incomplet n'est jamais importé", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => vi.unstubAllGlobals());

  it("demande le lot en une seule page de 1000 lignes", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse([ligne("A"), ligne("B")], 2));

    await expect(fetchCatnatByCodeInsee("36044")).resolves.toHaveLength(2);

    expect(fetch).toHaveBeenCalledOnce();
    expect(appels()[0].get("page_size")).toBe("1000");
  });

  it("une page qui rend moins de lignes qu'annoncé → erreur", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse([ligne("A")], 2));

    await expect(fetchCatnatByCodeInsee("36044")).rejects.toThrow("1 lignes distinctes sur 2 annoncées");
  });

  it("plusieurs pages complètes → toutes les lignes", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reponse([ligne("A"), ligne("B")], 3, 2))
      .mockResolvedValueOnce(reponse([ligne("C")], 3, 2));

    await expect(fetchCatnatByCodeInsee("36044")).resolves.toHaveLength(3);
    expect(appels().map((params) => params.get("page"))).toEqual(["1", "2"]);
  });

  it("plusieurs pages où un doublon a pris la place d'une ligne → erreur", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(reponse([ligne("A"), ligne("B")], 3, 2))
      .mockResolvedValueOnce(reponse([ligne("B")], 3, 2));

    await expect(fetchCatnatByCodeInsee("36044")).rejects.toThrow("2 lignes distinctes sur 3 annoncées");
  });

  it("découpe les communes par lots de 10", async () => {
    vi.mocked(fetch).mockResolvedValue(reponse([], 0));
    const codes = Array.from({ length: 25 }, (_, i) => `360${String(i).padStart(2, "0")}`);

    await fetchCatnatByCodesInsee(codes);

    expect(appels().map((params) => params.get("code_insee")?.split(",").length)).toEqual([10, 10, 5]);
  });

  it("aucune commune → aucun appel", async () => {
    await expect(fetchCatnatByCodesInsee([])).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
