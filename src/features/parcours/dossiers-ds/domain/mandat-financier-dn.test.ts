import { describe, expect, it } from "vitest";
import { estMandatFinancierDeclareDansDn } from "./mandat-financier-dn";

describe("estMandatFinancierDeclareDansDn", () => {
  it("reconnaît la réponse « administratif et financier »", () => {
    expect(estMandatFinancierDeclareDansDn("Mandataire administratif et financier")).toBe(true);
    expect(estMandatFinancierDeclareDansDn(" Mandataire administratif et financier ")).toBe(true);
  });

  it("n'infère rien des autres réponses ni d'une absence de réponse", () => {
    expect(estMandatFinancierDeclareDansDn("Mandataire administratif")).toBe(false);
    expect(estMandatFinancierDeclareDansDn("Pas de mandataire")).toBe(false);
    expect(estMandatFinancierDeclareDansDn(null)).toBe(false);
    expect(estMandatFinancierDeclareDansDn(undefined)).toBe(false);
  });
});
