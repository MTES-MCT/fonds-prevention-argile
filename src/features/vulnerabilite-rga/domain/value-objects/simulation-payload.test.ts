import { describe, it, expect } from "vitest";
import { vulnerabiliteSimulationPayloadSchema, toSimulationPayload } from "./simulation-payload";
import { CRITERES_CONFIG } from "./grille-categorisation";
import type { PartialVulnerabiliteReponses } from "../types/vulnerabilite-reponses.types";

const ANSWERS: PartialVulnerabiliteReponses = {
  adresse: {
    label: "1 rue Test, 36000 Châteauroux",
    communeNom: "Châteauroux",
    codeDepartement: "36",
    coordonnees: "1.5,46.8",
    clefBan: "clef-test",
    rnb: "rnb-1",
    aleaRga: "fort",
  },
  eaux: { pente_terrain: "vers_facade" },
  divers: { ensoleillement: "fort_sud" },
};

describe("toSimulationPayload", () => {
  it("ne laisse sortir du navigateur que le département et les réponses", () => {
    const payload = toSimulationPayload(ANSWERS);

    expect(payload.codeDepartement).toBe("36");
    expect(JSON.stringify(payload)).not.toContain("1 rue Test");
    expect(JSON.stringify(payload)).not.toContain("clef-test");
    expect(JSON.stringify(payload)).not.toContain("1.5,46.8");
    expect(JSON.stringify(payload)).not.toContain("rnb-1");
    expect(JSON.stringify(payload)).not.toContain("Châteauroux");
  });

  it("produit une charge utile acceptée par le schéma", () => {
    expect(vulnerabiliteSimulationPayloadSchema.safeParse(toSimulationPayload(ANSWERS)).success).toBe(true);
  });

  it("accepte un parcours sans adresse (département inconnu)", () => {
    const payload = toSimulationPayload({ eaux: { gouttieres: "ne_sais_pas" } });

    expect(payload.codeDepartement).toBeNull();
    expect(vulnerabiliteSimulationPayloadSchema.safeParse(payload).success).toBe(true);
  });
});

describe("vulnerabiliteSimulationPayloadSchema — dérivé de la grille", () => {
  it("accepte toutes les réponses de chaque question de la grille", () => {
    for (const critere of CRITERES_CONFIG) {
      for (const { reponse: valeur } of critere.reponses) {
        const result = vulnerabiliteSimulationPayloadSchema.safeParse({
          codeDepartement: "36",
          reponses: { [critere.id]: valeur },
        });
        expect(result.success, `${critere.id} = ${valeur}`).toBe(true);
      }
    }
  });

  it("accepte l'aléa issu de la carte, hors grille de catégorisation", () => {
    for (const aleaRga of ["fort", "moyen", "faible", "nul"]) {
      const result = vulnerabiliteSimulationPayloadSchema.safeParse({ codeDepartement: "36", reponses: { aleaRga } });
      expect(result.success, aleaRga).toBe(true);
    }
    expect(
      vulnerabiliteSimulationPayloadSchema.safeParse({ codeDepartement: "36", reponses: { aleaRga: "extreme" } })
        .success
    ).toBe(false);
  });

  it("rejette une réponse hors barème", () => {
    const result = vulnerabiliteSimulationPayloadSchema.safeParse({
      codeDepartement: "36",
      reponses: { pente_terrain: "valeur_injectee" },
    });

    expect(result.success).toBe(false);
  });

  it("rejette un code département qui n'en est pas un", () => {
    expect(vulnerabiliteSimulationPayloadSchema.safeParse({ codeDepartement: "<script>", reponses: {} }).success).toBe(
      false
    );
    expect(vulnerabiliteSimulationPayloadSchema.safeParse({ codeDepartement: "2A", reponses: {} }).success).toBe(true);
    expect(vulnerabiliteSimulationPayloadSchema.safeParse({ codeDepartement: "974", reponses: {} }).success).toBe(true);
  });

  it("ignore une catégorie envoyée par le client (jamais lue, jamais stockée)", () => {
    const result = vulnerabiliteSimulationPayloadSchema.safeParse({
      codeDepartement: "36",
      reponses: {},
      points: [],
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("points");
  });
});
