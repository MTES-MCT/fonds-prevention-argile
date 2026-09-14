import { describe, it, expect } from "vitest";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { peutReprendreAdresseExistante } from "./adresse-reprise";

const logement = (v: Record<string, unknown>) => v as PartialRGASimulationData["logement"];

describe("peutReprendreAdresseExistante", () => {
  it("reprend une adresse déjà qualifiée", () => {
    expect(peutReprendreAdresseExistante(logement({ coordonnees: "46.8,1.7", zone_dexposition: "fort" }))).toBe(true);
  });

  it("reprend aussi un logement hors zone argileuse", () => {
    // `null` est une réponse à part entière, pas une absence de réponse.
    expect(peutReprendreAdresseExistante(logement({ coordonnees: "46.8,1.7", zone_dexposition: null }))).toBe(true);
  });

  it("refuse de reprendre un dossier créé sans simulation", () => {
    // Adresse et coordonnées présentes, aucune zone : l'agent doit pouvoir sélectionner le
    // bâtiment sur la carte, sinon « Zone d'exposition forte » reste NON pour toujours.
    const sansSimulation = { adresse: "97 rue de Notz", commune: "36044", coordonnees: "46.8,1.7" };

    expect(peutReprendreAdresseExistante(logement(sansSimulation))).toBe(false);
  });

  it("refuse sans coordonnées, et sans logement du tout", () => {
    expect(peutReprendreAdresseExistante(logement({ zone_dexposition: "fort" }))).toBe(false);
    expect(peutReprendreAdresseExistante(undefined)).toBe(false);
  });
});
