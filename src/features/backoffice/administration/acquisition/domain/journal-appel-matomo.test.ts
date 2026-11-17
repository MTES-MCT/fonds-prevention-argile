import { describe, it, expect } from "vitest";
import { classerEchecReseau, decrireSegment, formaterJournalAppel } from "./journal-appel-matomo";

describe("decrireSegment", () => {
  it("ne garde que les noms des critères, jamais leurs valeurs", () => {
    expect(decrireSegment("dimension1==36;referrerName==exemple.test")).toBe("dimension1+referrerName");
  });

  it("signale l'absence de segment", () => {
    expect(decrireSegment(undefined)).toBe("aucun");
    expect(decrireSegment("")).toBe("aucun");
  });

  it("ne répète pas un critère présent deux fois", () => {
    expect(decrireSegment("eventAction==a,eventAction==b")).toBe("eventAction");
  });
});

describe("classerEchecReseau", () => {
  it("reconnaît le délai dépassé d'AbortSignal.timeout", () => {
    expect(classerEchecReseau(new DOMException("delai", "TimeoutError"))).toBe("timeout");
    expect(classerEchecReseau(new DOMException("abandon", "AbortError"))).toBe("timeout");
  });

  it("range le reste en erreur réseau", () => {
    expect(classerEchecReseau(new TypeError("fetch failed"))).toBe("erreur_reseau");
  });
});

describe("formaterJournalAppel", () => {
  it("écrit une ligne lisible et filtrable, sans valeur de segment", () => {
    const ligne = formaterJournalAppel({
      methode: "VisitsSummary.get",
      period: "range",
      date: "2026-10-18,2026-11-16",
      segment: "dimension1==36",
      simultanes: 4,
      dureeMs: 13506.7,
      issue: "timeout",
    });

    expect(ligne).toBe(
      "[matomo] appel methode=VisitsSummary.get period=range jours=30 segment=dimension1 simultanes=4 duree=13507ms issue=timeout"
    );
  });

  it("garde le mot-clé tel quel quand la plage n'est pas datée", () => {
    const ligne = formaterJournalAppel({
      methode: "Events.getAction",
      period: "range",
      date: "last7",
      simultanes: 1,
      dureeMs: 200,
      issue: "ok",
    });

    expect(ligne).toContain("jours=last7 segment=aucun");
  });
});
