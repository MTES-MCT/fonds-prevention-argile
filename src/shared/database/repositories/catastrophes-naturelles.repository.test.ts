import { describe, expect, it, vi } from "vitest";
import { periodesARetirer } from "./catastrophes-naturelles.repository";

vi.mock("../client", () => ({ db: {} }));

const periode = (codeNationalCatnat: string, codeInsee: string, dateDebutEvt: string) => ({
  codeNationalCatnat,
  codeInsee,
  dateDebutEvt,
});

describe("periodesARetirer — la source fait foi pour les arrêtés qu'elle renvoie", () => {
  it("retire la période dont la date a été corrigée à la source", () => {
    const enBase = [periode("INTE2612297A", "36044", "2024-12-31")];
    const recues = [periode("INTE2612297A", "36044", "2025-01-01")];

    expect(periodesARetirer(enBase, recues)).toEqual(enBase);
  });

  it("garde les deux périodes d'un même arrêté pour la même commune", () => {
    const enBase = [periode("IOME2316198A", "54395", "2022-01-01"), periode("IOME2316198A", "54395", "2022-07-01")];

    expect(periodesARetirer(enBase, enBase)).toEqual([]);
  });

  it("ne touche pas un arrêté de la commune que la source n'a pas renvoyé", () => {
    const enBase = [periode("INTE1914147A", "36044", "2018-07-01")];
    const recues = [periode("INTE2612297A", "36044", "2025-01-01")];

    expect(periodesARetirer(enBase, recues)).toEqual([]);
  });

  it("ne touche pas le même arrêté dans une commune absente de la réponse", () => {
    const enBase = [periode("INTE2612297A", "36211", "2024-12-31")];
    const recues = [periode("INTE2612297A", "36044", "2025-01-01")];

    expect(periodesARetirer(enBase, recues)).toEqual([]);
  });
});
