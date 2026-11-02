import { describe, expect, it } from "vitest";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { motifsDeRefusFusion, planFusion, type EtatFusionInvite } from "./fusion-invite";

const simulation = (adresse: string, complete = true) =>
  ({
    logement: {
      adresse,
      type: "maison",
      code_departement: "03",
      zone_dexposition: "fort",
      annee_de_construction: "1938",
      niveaux: 2,
      mitoyen: false,
      proprietaire_occupant: true,
    },
    rga: {
      sinistres: "endommagée",
      indemnise_indemnise_rga: false,
      demande_catnat_en_cours: false,
      assure: true,
    },
    menage: complete ? { personnes: 2, revenu_rga: 20000 } : {},
  }) as unknown as RGASimulationData;

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
      simulationAgent: simulation("12 Rue des Lilas 03000 Moulins"),
      ...overrides.invite,
    },
    compte: {
      parcoursId: "compte",
      fcId: "sub-fc",
      nbDossiersDn: 0,
      simulationDemandeur: simulation("12 rue des lilas  03000 Moulins"),
      simulationAgent: null,
      ...overrides.compte,
    },
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

  it("refuse de copier la simulation sur un compte qui a déjà un formulaire DN", () => {
    expect(motifsDeRefusFusion(etat({ compte: { nbDossiersDn: 1 } }))).toEqual([
      "Le compte cible porte un formulaire DN : y copier la simulation de l'agent le ferait diverger.",
    ]);
  });

  it("accepte un compte avec formulaire DN quand rien n'y est copié", () => {
    const compteDejaCorrige = { nbDossiersDn: 1, simulationAgent: simulation("12 Rue des Lilas 03000 Moulins") };
    expect(motifsDeRefusFusion(etat({ compte: compteDejaCorrige }))).toEqual([]);
  });

  it("refuse le même parcours des deux côtés", () => {
    expect(motifsDeRefusFusion(etat({ compte: { parcoursId: "invite" } }))).toContain(
      "Les deux identifiants désignent le même parcours."
    );
  });

  it("refuse deux adresses différentes, sauf acceptation explicite", () => {
    const differentes = { compte: { simulationDemandeur: simulation("3 avenue de Paris 03100 Montluçon") } };
    expect(motifsDeRefusFusion(etat(differentes))).toHaveLength(1);
    expect(motifsDeRefusFusion(etat({ ...differentes, adressesDifferentesAcceptees: true }))).toEqual([]);
  });

  it("ne tient pas une adresse absente pour identique", () => {
    expect(
      motifsDeRefusFusion(etat({ invite: { simulationAgent: null }, compte: { simulationDemandeur: null } }))
    ).toHaveLength(1);
  });
});

describe("planFusion", () => {
  it("copie la simulation de l'agent sans la promouvoir quand le compte a la sienne", () => {
    expect(planFusion(etat({}))).toEqual({ copierSimulation: true, promouvoirSimulation: false });
  });

  it("promeut une simulation complète sur un compte qui n'en a aucune", () => {
    expect(planFusion(etat({ compte: { simulationDemandeur: null } }))).toEqual({
      copierSimulation: true,
      promouvoirSimulation: true,
    });
  });

  it("ne promeut pas une simulation incomplète", () => {
    const incomplete = { invite: { simulationAgent: simulation("x", false) }, compte: { simulationDemandeur: null } };
    expect(planFusion(etat(incomplete)).promouvoirSimulation).toBe(false);
  });

  it("ne copie rien quand le compte a déjà une correction d'agent", () => {
    const corrige = { compte: { simulationAgent: simulation("12 Rue des Lilas 03000 Moulins") } };
    expect(planFusion(etat(corrige))).toEqual({ copierSimulation: false, promouvoirSimulation: false });
  });
});
