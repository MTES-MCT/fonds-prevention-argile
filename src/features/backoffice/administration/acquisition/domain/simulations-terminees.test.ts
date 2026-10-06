import { describe, it, expect } from "vitest";
import {
  cumulerSimulationsTerminees,
  lireSimulationsTerminees,
  totalSimulationsTerminees,
  type LigneEvenementNomme,
} from "./simulations-terminees";

const ligne = (nom: string, action: string, nb_events: number | string): LigneEvenementNomme => ({
  Events_EventName: nom,
  Events_EventAction: action,
  nb_events,
});

describe("lireSimulationsTerminees", () => {
  it("répartit les résultats par département au format officiel", () => {
    const simulations = lireSimulationsTerminees([
      ligne("63", "simulateur_result_eligible", 10),
      ligne("63", "simulateur_result_non_eligible", 4),
      ligne("3", "simulateur_result_non_eligible", 2),
    ]);

    expect(simulations.parDepartement.get("63")).toEqual({ eligible: 10, nonEligible: 4 });
    expect(simulations.parDepartement.get("03")).toEqual({ eligible: 0, nonEligible: 2 });
  });

  it("range en non renseigné un nom absent ou qui n'est pas un département, quelle que soit la langue", () => {
    const simulations = lireSimulationsTerminees([
      ligne("Nom d'événement indéfini", "simulateur_result_eligible", 7),
      ligne("Event name not defined", "simulateur_result_non_eligible", 3),
      { Events_EventAction: "simulateur_result_non_eligible", nb_events: 1 },
    ]);

    expect(simulations.parDepartement.size).toBe(0);
    expect(simulations.nonRenseigne).toEqual({ eligible: 7, nonEligible: 4 });
  });

  it("ignore les autres évènements du simulateur", () => {
    const simulations = lireSimulationsTerminees([ligne("63", "simulateur_step_adresse", 99)]);

    expect(totalSimulationsTerminees(simulations)).toEqual({ eligible: 0, nonEligible: 0 });
  });

  it("additionne un compteur sérialisé en chaîne", () => {
    expect(
      lireSimulationsTerminees([ligne("63", "simulateur_result_eligible", "12")]).parDepartement.get("63")
    ).toEqual({
      eligible: 12,
      nonEligible: 0,
    });
  });

  it("refuse un compteur non numérique plutôt que de fausser le total", () => {
    expect(() => lireSimulationsTerminees([ligne("63", "simulateur_result_eligible", "n/a")])).toThrow(/non numerique/);
  });
});

describe("cumulerSimulationsTerminees", () => {
  it("additionne les sous-périodes, départements et non renseigné compris", () => {
    const septembre = lireSimulationsTerminees([
      ligne("63", "simulateur_result_eligible", 5),
      ligne("-", "simulateur_result_non_eligible", 2),
    ]);
    const octobre = lireSimulationsTerminees([
      ligne("63", "simulateur_result_non_eligible", 1),
      ligne("75", "simulateur_result_non_eligible", 3),
    ]);

    const cumul = cumulerSimulationsTerminees([septembre, octobre]);

    expect(cumul.parDepartement.get("63")).toEqual({ eligible: 5, nonEligible: 1 });
    expect(cumul.parDepartement.get("75")).toEqual({ eligible: 0, nonEligible: 3 });
    expect(totalSimulationsTerminees(cumul)).toEqual({ eligible: 5, nonEligible: 6 });
  });
});
