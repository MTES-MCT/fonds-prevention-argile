import { describe, it, expect, vi } from "vitest";
import { lireAdresseTransmise, resoudreAdresseTransmise } from "./adresse-transmise";
import type { BanFeature } from "./ban.types";

function feature(score: number, type: BanFeature["properties"]["type"] = "housenumber"): BanFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [1.68, 46.8] },
    properties: {
      label: "97 Rue de Notz 36000 Châteauroux",
      score,
      id: "36044_2080_00097",
      type,
      name: "97 Rue de Notz",
      postcode: "36000",
      citycode: "36044",
      city: "Châteauroux",
      context: "36, Indre, Centre-Val de Loire",
    },
  };
}

describe("lireAdresseTransmise", () => {
  it("lit l'adresse encodée du fragment", () => {
    const hash = `#adresse=${encodeURIComponent("97 rue de Notz 36000 Châteauroux")}`;
    expect(lireAdresseTransmise(hash)).toEqual({ texte: "97 rue de Notz 36000 Châteauroux", rnb: null });
  });

  it("garde un RNB bien formé et ignore les autres", () => {
    expect(lireAdresseTransmise("#adresse=97 rue de Notz&rnb=ABCD-1234-EFGH")?.rnb).toBe("ABCD-1234-EFGH");
    expect(lireAdresseTransmise("#adresse=97 rue de Notz&rnb=<script>")?.rnb).toBeNull();
  });

  it("nettoie les espaces et les caractères de contrôle", () => {
    expect(lireAdresseTransmise("#adresse=97%20%20rue%0Ade%20Notz")?.texte).toBe("97 rue de Notz");
  });

  it("refuse une adresse absente, trop courte ou trop longue", () => {
    expect(lireAdresseTransmise("")).toBeNull();
    expect(lireAdresseTransmise("#d=abc")).toBeNull();
    expect(lireAdresseTransmise("#adresse=12")).toBeNull();
    expect(lireAdresseTransmise(`#adresse=${"a".repeat(201)}`)).toBeNull();
  });
});

describe("resoudreAdresseTransmise", () => {
  const adresse = { texte: "97 rue de Notz Châteauroux", rnb: "ABCD-1234-EFGH" };

  it("résout une réponse nette et conserve le RNB", async () => {
    const recherche = vi.fn().mockResolvedValue([feature(0.97), feature(0.8)]);
    const resolution = await resoudreAdresseTransmise(adresse, recherche);
    expect(resolution).toMatchObject({ statut: "resolue", rnb: "ABCD-1234-EFGH" });
  });

  it("laisse choisir quand deux réponses se valent", async () => {
    const recherche = vi.fn().mockResolvedValue([feature(0.93), feature(0.91)]);
    expect(await resoudreAdresseTransmise(adresse, recherche)).toEqual({ statut: "a_choisir", texte: adresse.texte });
  });

  it("laisse choisir quand le score est faible ou que ce n'est pas un numéro de rue", async () => {
    expect((await resoudreAdresseTransmise(adresse, vi.fn().mockResolvedValue([feature(0.6)]))).statut).toBe(
      "a_choisir"
    );
    expect((await resoudreAdresseTransmise(adresse, vi.fn().mockResolvedValue([feature(0.95, "street")]))).statut).toBe(
      "a_choisir"
    );
  });

  it("laisse choisir quand rien n'est trouvé", async () => {
    expect((await resoudreAdresseTransmise(adresse, vi.fn().mockResolvedValue([]))).statut).toBe("a_choisir");
  });
});
