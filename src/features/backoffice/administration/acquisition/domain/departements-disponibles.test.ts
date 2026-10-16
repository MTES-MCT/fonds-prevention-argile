import { describe, expect, it } from "vitest";
import { ordonnerDepartementsDisponibles } from "./departements-disponibles";

describe("ordonnerDepartementsDisponibles", () => {
  it("met les départements du fonds en tête, puis les autres par code, sans ajouter ceux sans parcours", () => {
    const liste = ordonnerDepartementsDisponibles(
      new Map([
        ["75", 40],
        ["3", 12],
        ["13", 3],
        ["59", 30],
      ])
    );

    expect(liste.map((d) => d.code)).toEqual(["3", "59", "13", "75"]);
    expect(liste[0]).toEqual({ code: "3", nom: "Allier", nombreParcours: 12 });
  });
});
