import { describe, it, expect } from "vitest";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { getResponsableDossier, type ResponsableInput } from "./responsable.service";

const av = { id: "av-1", nom: "ADIL 36" };
const entreprise = { id: "amo-1", nom: "Entreprise A" };

function makeInput(overrides: Partial<ResponsableInput> = {}): ResponsableInput {
  return {
    validation: null,
    codeDepartement: "36",
    allersVersTerritorial: av,
    ...overrides,
  };
}

describe("getResponsableDossier", () => {
  it("AV par défaut quand aucune validation AMO n'est posée", () => {
    const result = getResponsableDossier(makeInput({ validation: null }));
    expect(result).toMatchObject({ type: "AV", structureId: "av-1", structureNom: "ADIL 36", codeDepartement: "36" });
  });

  it("AV pour une renonciation explicite (SANS_AMO)", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.SANS_AMO, entreprise: null },
      })
    );
    expect(result).toMatchObject({ type: "AV", structureId: "av-1" });
  });

  it("AMO pour une validation EN_ATTENTE (accompagnement posé)", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entreprise },
      })
    );
    expect(result).toMatchObject({ type: "AMO", entrepriseId: "amo-1", entrepriseNom: "Entreprise A", codeDepartement: "36" });
  });

  it("AMO sticky pour une validation LOGEMENT_ELIGIBLE (reste responsable après validation)", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entreprise },
      })
    );
    expect(result).toMatchObject({ type: "AMO", entrepriseId: "amo-1" });
  });

  it("AMO sticky pour une validation LOGEMENT_NON_ELIGIBLE (responsable AMO + état REFUSE)", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, entreprise },
      })
    );
    expect(result).toMatchObject({ type: "AMO", entrepriseId: "amo-1" });
  });

  it("AMO sticky pour une validation ACCOMPAGNEMENT_REFUSE (responsable AMO + état REFUSE)", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.ACCOMPAGNEMENT_REFUSE, entreprise },
      })
    );
    expect(result).toMatchObject({ type: "AMO", entrepriseId: "amo-1" });
  });

  it("AV si validation EN_ATTENTE sans entreprise (cas limite défensif)", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entreprise: null },
      })
    );
    expect(result).toMatchObject({ type: "AV", structureId: "av-1" });
  });

  it("INDETERMINE si aucun AV territorial n'est résolu et pas d'AMO", () => {
    const result = getResponsableDossier(makeInput({ allersVersTerritorial: null }));
    expect(result).toEqual({ type: "INDETERMINE" });
  });

  it("AMO sticky même si aucun AV territorial n'est résolu (l'AMO prime)", () => {
    const result = getResponsableDossier(
      makeInput({
        allersVersTerritorial: null,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entreprise },
      })
    );
    expect(result).toMatchObject({ type: "AMO", entrepriseId: "amo-1" });
  });
});
