import { describe, it, expect } from "vitest";
import { decouperPeriodeMatomo, formaterDateMatomo, type SousPeriodeMatomo } from "./decoupage-periode";

function jour(iso: string): Date {
  const [annee, mois, date] = iso.split("-").map(Number);
  return new Date(annee, mois - 1, date);
}

/** Déplie les sous-périodes en jours, pour vérifier la couverture sans trou ni doublon. */
function joursCouverts(sousPeriodes: SousPeriodeMatomo[]): string[] {
  const jours: string[] = [];
  for (const sousPeriode of sousPeriodes) {
    const [debut, fin] = sousPeriode.date.split(",").map(jour);
    for (const courant = new Date(debut); courant <= fin; courant.setDate(courant.getDate() + 1)) {
      jours.push(formaterDateMatomo(courant));
    }
  }
  return jours;
}

function joursAttendus(debutIso: string, finIso: string): string[] {
  const jours: string[] = [];
  const fin = jour(finIso);
  for (const courant = jour(debutIso); courant <= fin; courant.setDate(courant.getDate() + 1)) {
    jours.push(formaterDateMatomo(courant));
  }
  return jours;
}

describe("decouperPeriodeMatomo — alignement sur les bornes de calendrier Matomo", () => {
  it("garde un seul appel journalier quand la granularité est déjà 'day'", () => {
    expect(decouperPeriodeMatomo(jour("2026-08-10"), jour("2026-09-08"), "day")).toEqual([
      { period: "day", date: "2026-08-10,2026-09-08" },
    ]);
  });

  it("borne les semaines pleines et comble les deux bords en jours", () => {
    // Fenêtre réelle de la période précédente du filtre « 90j » au 08/09/2026. Vérifié sur
    // l'instance : `period=week&date=2026-03-12,2026-06-10` renvoie la clé "2026-03-09,2026-03-15",
    // soit 3 jours avant la borne demandée — et sa dernière semaine (08–14/06) est aussi la
    // première de la période courante, d'où le double comptage que ce découpage supprime.
    expect(decouperPeriodeMatomo(jour("2026-03-12"), jour("2026-06-10"), "week")).toEqual([
      { period: "day", date: "2026-03-12,2026-03-15" },
      { period: "week", date: "2026-03-16,2026-06-07" },
      { period: "day", date: "2026-06-08,2026-06-10" },
    ]);
  });

  it("comble les bords d'une fenêtre mensuelle en semaines puis en jours", () => {
    expect(decouperPeriodeMatomo(jour("2025-09-08"), jour("2026-09-08"), "month")).toEqual([
      { period: "week", date: "2025-09-08,2025-09-28" },
      { period: "day", date: "2025-09-29,2025-09-30" },
      { period: "month", date: "2025-10-01,2026-08-31" },
      { period: "day", date: "2026-09-01,2026-09-08" },
    ]);
  });

  it("n'émet qu'un bucket quand la fenêtre est déjà alignée", () => {
    expect(decouperPeriodeMatomo(jour("2026-01-01"), jour("2026-03-31"), "month")).toEqual([
      { period: "month", date: "2026-01-01,2026-03-31" },
    ]);
  });

  it("redescend en jours quand aucun bucket entier ne tient dans la fenêtre", () => {
    expect(decouperPeriodeMatomo(jour("2026-06-09"), jour("2026-06-11"), "week")).toEqual([
      { period: "day", date: "2026-06-09,2026-06-11" },
    ]);
  });

  it("ne renvoie rien sur une fenêtre vide", () => {
    expect(decouperPeriodeMatomo(jour("2026-06-11"), jour("2026-06-09"), "week")).toEqual([]);
  });

  it.each([
    ["semaines, bords des deux côtés", "2026-03-12", "2026-06-10", "week" as const],
    ["mois, bords des deux côtés", "2025-09-08", "2026-09-08", "month" as const],
    ["mois, début aligné", "2025-10-01", "2026-09-08", "month" as const],
    ["semaines, fin alignée", "2026-03-12", "2026-06-07", "week" as const],
    ["jours", "2026-08-10", "2026-09-08", "day" as const],
    ["fenêtre d'un seul jour", "2026-09-08", "2026-09-08", "month" as const],
  ])("couvre exactement la fenêtre demandée, sans trou ni chevauchement (%s)", (_, debut, fin, granularite) => {
    const couverts = joursCouverts(decouperPeriodeMatomo(jour(debut), jour(fin), granularite));

    expect(couverts).toEqual(joursAttendus(debut, fin));
    expect(new Set(couverts).size).toBe(couverts.length);
  });

  it("ne fait chevaucher aucune journée entre une période et la précédente", () => {
    // Le double comptage constaté venait de la semaine frontière présente dans les deux fenêtres.
    const courante = joursCouverts(decouperPeriodeMatomo(jour("2026-06-11"), jour("2026-09-08"), "week"));
    const precedente = joursCouverts(decouperPeriodeMatomo(jour("2026-03-13"), jour("2026-06-10"), "week"));

    expect(courante.filter((j) => precedente.includes(j))).toEqual([]);
  });
});
