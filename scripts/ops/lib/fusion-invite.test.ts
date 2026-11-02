import { describe, expect, it } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { motifsDeRefusFusion, type EtatFusionInvite } from "./fusion-invite";

function etat(overrides: {
  invite?: Partial<EtatFusionInvite["invite"]>;
  compte?: Partial<EtatFusionInvite["compte"]>;
  adressesDifferentesAcceptees?: boolean;
}): EtatFusionInvite {
  return {
    invite: {
      parcoursId: "invite",
      fcId: null,
      claimedAt: null,
      currentStep: Step.INVITATION,
      nbDossiersDn: 0,
      nbQualifications: 0,
      adresse: "12 Rue des Lilas 03000 Moulins",
      ...overrides.invite,
    },
    compte: { parcoursId: "compte", fcId: "sub-fc", adresse: "12 rue des lilas  03000 Moulins", ...overrides.compte },
    adressesDifferentesAcceptees: overrides.adressesDifferentesAcceptees ?? false,
  };
}

describe("motifsDeRefusFusion", () => {
  it("accepte un stub jamais réclamé et un compte FranceConnect à la même adresse", () => {
    expect(motifsDeRefusFusion(etat({}))).toEqual([]);
  });

  it("refuse un dossier invité déjà réclamé ou sorti de l'étape invitation", () => {
    expect(motifsDeRefusFusion(etat({ invite: { fcId: "autre-sub" } }))).toHaveLength(1);
    expect(motifsDeRefusFusion(etat({ invite: { claimedAt: new Date() } }))).toHaveLength(1);
    expect(motifsDeRefusFusion(etat({ invite: { currentStep: Step.CHOIX_AMO } }))).toHaveLength(1);
  });

  it("refuse un compte cible sans FranceConnect", () => {
    expect(motifsDeRefusFusion(etat({ compte: { fcId: null } }))).toEqual([
      "Le compte cible n'est pas rattaché à FranceConnect.",
    ]);
  });

  it("refuse quand le dossier invité porte un formulaire DN ou une qualification", () => {
    expect(motifsDeRefusFusion(etat({ invite: { nbDossiersDn: 1 } }))).toHaveLength(1);
    expect(motifsDeRefusFusion(etat({ invite: { nbQualifications: 2 } }))).toHaveLength(1);
  });

  it("refuse le même parcours des deux côtés", () => {
    expect(motifsDeRefusFusion(etat({ compte: { parcoursId: "invite" } }))).toContain(
      "Les deux identifiants désignent le même parcours."
    );
  });

  it("refuse deux adresses différentes, sauf acceptation explicite", () => {
    const differentes = { compte: { adresse: "3 avenue de Paris 03100 Montluçon" } };
    expect(motifsDeRefusFusion(etat(differentes))).toHaveLength(1);
    expect(motifsDeRefusFusion(etat({ ...differentes, adressesDifferentesAcceptees: true }))).toEqual([]);
  });

  it("ne tient pas une adresse absente pour identique", () => {
    expect(motifsDeRefusFusion(etat({ invite: { adresse: null }, compte: { adresse: null } }))).toHaveLength(1);
  });
});
