import { describe, it, expect } from "vitest";
import { vulnerabiliteSimulationPayloadSchema, toSimulationPayload } from "./simulation-payload";
import { CRITERES_CONFIG, ESSENCES_AGRESSIVITE } from "./grille-ponderation";
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
  it("accepte toutes les réponses du barème de chaque critère", () => {
    for (const critere of CRITERES_CONFIG) {
      const essences = Object.keys(ESSENCES_AGRESSIVITE);
      const bareme = critere.bareme.map((b) => b.reponse);
      const valeurs = bareme.length > 0 ? bareme : essences;

      for (const valeur of valeurs) {
        const result = vulnerabiliteSimulationPayloadSchema.safeParse({
          codeDepartement: "36",
          reponses: { [critere.id]: valeur },
        });
        expect(result.success, `${critere.id} = ${valeur}`).toBe(true);
      }
    }
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

  it("ignore un score envoyé par le client (jamais lu, jamais stocké)", () => {
    const result = vulnerabiliteSimulationPayloadSchema.safeParse({
      codeDepartement: "36",
      reponses: {},
      scoreGlobal: 0,
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("scoreGlobal");
  });
});
