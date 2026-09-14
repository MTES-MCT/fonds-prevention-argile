import { describe, it, expect } from "vitest";
import type { PartialRGASimulationData } from "@/shared/domain/types";
import { peutReprendreAdresseExistante } from "./adresse-reprise";

const logement = (v: Record<string, unknown>) => v as PartialRGASimulationData["logement"];
const COORD = "46.801535,1.685996";

describe("peutReprendreAdresseExistante", () => {
  it("reprend une adresse déjà qualifiée", () => {
    expect(peutReprendreAdresseExistante(logement({ coordonnees: COORD, zone_dexposition: "fort" }))).toBe(true);
  });

  it("reprend un logement hors zone argileuse, reconnu à son identifiant RNB", () => {
    // `zone_dexposition: null` est une réponse à part entière. On ne peut pas la distinguer
    // d'une absence par la seule présence de la clé : l'appelant construit un littéral dont
    // toutes les clés existent, fût-ce à `undefined`.
    const horsZone = { coordonnees: COORD, zone_dexposition: null, rnb: "RNB-123" };

    expect(peutReprendreAdresseExistante(logement(horsZone))).toBe(true);
  });

  it("refuse de reprendre un dossier créé sans simulation", () => {
    // Adresse et coordonnées présentes, aucun bâtiment jamais sélectionné : l'agent doit
    // pouvoir cliquer la carte, sinon « Zone d'exposition forte » reste NON pour toujours.
    const sansSimulation = { adresse: "97 rue de Notz", commune: "36044", coordonnees: COORD };

    expect(peutReprendreAdresseExistante(logement(sansSimulation))).toBe(false);
    // Et tel que l'appelant le reconstruit : toutes les clés présentes, à undefined.
    expect(
      peutReprendreAdresseExistante(logement({ ...sansSimulation, zone_dexposition: undefined, rnb: undefined }))
    ).toBe(false);
  });

  it("refuse sans coordonnées, et sans logement du tout", () => {
    expect(peutReprendreAdresseExistante(logement({ zone_dexposition: "fort" }))).toBe(false);
    expect(peutReprendreAdresseExistante(undefined)).toBe(false);
  });
});
