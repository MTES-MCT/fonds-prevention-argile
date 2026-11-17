import { describe, it, expect } from "vitest";
import { compterJoursPlage, estPlageStable, lirePlageMatomo } from "./plage-matomo";

describe("lirePlageMatomo", () => {
  it("lit une plage en dates locales, sans décalage de fuseau", () => {
    const plage = lirePlageMatomo("2026-03-01,2026-03-31");

    expect(plage?.debut.getDate()).toBe(1);
    expect(plage?.fin.getDate()).toBe(31);
    expect(plage?.fin.getMonth()).toBe(2);
  });

  it("accepte un jour seul", () => {
    expect(compterJoursPlage("2026-03-15")).toBe(1);
  });

  it("renvoie null pour un mot-clé Matomo, dont la fin dépend du jour de l'appel", () => {
    expect(lirePlageMatomo("last30")).toBeNull();
    expect(lirePlageMatomo("2025-01-01,today")).toBeNull();
  });

  it("renvoie null pour une plage inversée", () => {
    expect(lirePlageMatomo("2026-03-31,2026-03-01")).toBeNull();
  });
});

describe("compterJoursPlage", () => {
  it("compte les deux bornes", () => {
    expect(compterJoursPlage("2026-03-01,2026-03-31")).toBe(31);
  });

  it("ne perd pas un jour au changement d'heure", () => {
    expect(compterJoursPlage("2026-03-28,2026-03-30")).toBe(3);
    expect(compterJoursPlage("2026-10-24,2026-10-26")).toBe(3);
  });
});

describe("estPlageStable", () => {
  const maintenant = new Date(2026, 10, 16, 9, 30);

  it("tient une plage close depuis deux jours pour stable", () => {
    expect(estPlageStable("2026-10-01,2026-11-14", maintenant)).toBe(true);
  });

  it("garde la veille en cache court : Matomo peut encore la réarchiver", () => {
    expect(estPlageStable("2026-10-01,2026-11-15", maintenant)).toBe(false);
  });

  it("garde en cache court une plage qui contient aujourd'hui", () => {
    expect(estPlageStable("2026-11-10,2026-11-16", maintenant)).toBe(false);
  });

  it("garde en cache court un mot-clé, faute de borne lisible", () => {
    expect(estPlageStable("last30", maintenant)).toBe(false);
  });
});
