import { describe, it, expect } from "vitest";
import { classerCasPrefill, CasPrefill, CAS_PREFILL_ORDRE, CAS_PREFILL_META } from "./cas-prefill";
import { Step } from "@/shared/domain/value-objects/step.enum";

const MAINTENANT = new Date("2026-08-27T12:00:00Z");
const ilYa = (jours: number) => new Date(MAINTENANT.getTime() - jours * 86_400_000);

describe("classerCasPrefill", () => {
  it("classe un prérempli de moins de 7 jours en « trop tôt »", () => {
    const cas = classerCasPrefill(
      { step: Step.ELIGIBILITE, prefillCreatedAt: ilYa(3), lastLogin: ilYa(1) },
      MAINTENANT
    );
    expect(cas).toBe(CasPrefill.RECENT);
  });

  // Le diagnostic ne peut être transmis qu'une fois réalisé : l'ancienneté ne dit rien ici.
  it("classe toute étape diagnostic en attente, quelle que soit son ancienneté", () => {
    const cas = classerCasPrefill(
      { step: Step.DIAGNOSTIC, prefillCreatedAt: ilYa(120), lastLogin: ilYa(200) },
      MAINTENANT
    );
    expect(cas).toBe(CasPrefill.ATTENTE_DIAGNOSTIC);
  });

  it("repère le demandeur revenu après avoir ouvert son formulaire", () => {
    const cas = classerCasPrefill(
      { step: Step.ELIGIBILITE, prefillCreatedAt: ilYa(40), lastLogin: ilYa(2) },
      MAINTENANT
    );
    expect(cas).toBe(CasPrefill.REVENU_SANS_DEPOSER);
  });

  it("classe sans nouvelles au-delà d'un mois sans retour", () => {
    const cas = classerCasPrefill(
      { step: Step.ELIGIBILITE, prefillCreatedAt: ilYa(40), lastLogin: ilYa(45) },
      MAINTENANT
    );
    expect(cas).toBe(CasPrefill.SANS_NOUVELLES);
  });

  it("reste prudent entre 7 et 30 jours sans retour", () => {
    const cas = classerCasPrefill(
      { step: Step.ELIGIBILITE, prefillCreatedAt: ilYa(20), lastLogin: ilYa(25) },
      MAINTENANT
    );
    expect(cas).toBe(CasPrefill.EN_COURS);
  });

  it("ne conclut rien sans date de prérempli", () => {
    const cas = classerCasPrefill({ step: Step.ELIGIBILITE, prefillCreatedAt: null, lastLogin: null }, MAINTENANT);
    expect(cas).toBe(CasPrefill.EN_COURS);
  });

  it("décrit chaque cas et les ordonne tous", () => {
    expect(CAS_PREFILL_ORDRE).toHaveLength(Object.keys(CasPrefill).length);
    for (const cas of CAS_PREFILL_ORDRE) expect(CAS_PREFILL_META[cas].aFaire).toBeTruthy();
  });
});
