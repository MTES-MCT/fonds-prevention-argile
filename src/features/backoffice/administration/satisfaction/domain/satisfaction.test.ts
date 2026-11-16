import { describe, expect, it } from "vitest";
import { calculerStatsSatisfaction } from "./satisfaction";

const notes = (sujet: string, ...valeurs: number[]) => valeurs.map((note) => ({ sujet, note }));

describe("calculerStatsSatisfaction", () => {
  it("liste chaque sujet demandé, même sans réponse", () => {
    const stats = calculerStatsSatisfaction([], ["simulateur", "diagnostic"]);

    expect(stats.map((s) => [s.libelle, s.reponses])).toEqual([
      ["Simulateur d'éligibilité", 0],
      ["Diagnostic", 0],
    ]);
  });

  it("compte les réponses par note", () => {
    const [stat] = calculerStatsSatisfaction(notes("devis", 1, 1, 4, 5), ["devis"]);

    expect(stat.reponses).toBe(4);
    expect(stat.repartition).toEqual({ 1: 2, 2: 0, 3: 0, 4: 1, 5: 1 });
  });

  it("ignore un sujet ou une note inconnus, et un sujet non demandé", () => {
    const lignes = [...notes("devis", 4), ...notes("paiement", 5), ...notes("devis", 9), ...notes("vulnerabilite", 3)];

    const stats = calculerStatsSatisfaction(lignes, ["devis"]);

    expect(stats).toHaveLength(1);
    expect(stats[0].reponses).toBe(1);
  });
});
