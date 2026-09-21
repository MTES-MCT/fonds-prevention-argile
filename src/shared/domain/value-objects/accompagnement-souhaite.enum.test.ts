import { describe, it, expect } from "vitest";
import { AccompagnementSouhaite, isAccompagnementSouhaite } from "./accompagnement-souhaite.enum";

describe("isAccompagnementSouhaite", () => {
  it.each(Object.values(AccompagnementSouhaite))("accepte la valeur %s", (valeur) => {
    expect(isAccompagnementSouhaite(valeur)).toBe(true);
  });

  it("rejette une absence de réponse : la question n'a pas été posée", () => {
    expect(isAccompagnementSouhaite(null)).toBe(false);
    expect(isAccompagnementSouhaite(undefined)).toBe(false);
  });

  it("rejette une valeur inconnue venue de la base ou du client", () => {
    expect(isAccompagnementSouhaite("peut-etre")).toBe(false);
    expect(isAccompagnementSouhaite("")).toBe(false);
  });
});
