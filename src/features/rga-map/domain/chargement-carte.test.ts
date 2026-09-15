import { describe, it, expect } from "vitest";

import { estCartePrete } from "./chargement-carte";

describe("estCartePrete", () => {
  it("n'est jamais prete tant que le style n'est pas charge", () => {
    expect(estCartePrete({ isReady: false, selectionEnabled: true, layersReady: true })).toBe(false);
    expect(estCartePrete({ isReady: false, selectionEnabled: false, layersReady: false })).toBe(false);
  });

  describe("selection active (simulateur)", () => {
    it("attend les tuiles RNB avant de se declarer prete", () => {
      expect(estCartePrete({ isReady: true, selectionEnabled: true, layersReady: false })).toBe(false);
    });

    it("est prete une fois les tuiles RNB chargees", () => {
      expect(estCartePrete({ isReady: true, selectionEnabled: true, layersReady: true })).toBe(true);
    });
  });

  describe("lecture seule (pages RGA publiques)", () => {
    // Regression : `layersReady` restant faux, l'overlay "Chargement de la carte..."
    // ne se levait jamais sur /rga/departement, /rga/commune et /rga/epci.
    it("est prete sans attendre les tuiles RNB, qui ne se chargeront jamais", () => {
      expect(estCartePrete({ isReady: true, selectionEnabled: false, layersReady: false })).toBe(true);
    });
  });
});
