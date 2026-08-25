import { describe, it, expect } from "vitest";
import { extraireNumerosDepuisErreur } from "./_shared";

// Seul moyen de retrouver un numéro DN dont le pointeur a été supprimé (ADR-0027).
describe("extraireNumerosDepuisErreur", () => {
  it("extrait l'étape et le numéro d'une erreur de sync", () => {
    const msg = "eligibilite: Sync dossier 32052358 échouée: GraphQL errors: Dossier not found";
    expect(extraireNumerosDepuisErreur(msg)).toEqual([{ step: "eligibilite", dsNumber: "32052358" }]);
  });

  it("extrait toutes les erreurs quand plusieurs sont concaténées", () => {
    const msg =
      "eligibilite: Sync dossier 32052358 échouée: Dossier not found | " +
      "diagnostic: Sync dossier 31999111 échouée: unauthorized";
    expect(extraireNumerosDepuisErreur(msg)).toEqual([
      { step: "eligibilite", dsNumber: "32052358" },
      { step: "diagnostic", dsNumber: "31999111" },
    ]);
  });

  it("ne remonte rien sur un message sans numéro", () => {
    expect(extraireNumerosDepuisErreur("Parcours disparu pendant la synchro")).toEqual([]);
  });
});
