import { describe, it, expect } from "vitest";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { getResponsableDossier, type ResponsableInput } from "./responsable.service";

const av = { id: "av-1", nom: "ADIL 36" };
const entreprise = { id: "amo-1", nom: "Entreprise A" };

function makeInput(overrides: Partial<ResponsableInput> = {}): ResponsableInput {
  return {
    currentStatus: Status.TODO,
    archivedAt: null,
    validation: null,
    codeDepartement: "36",
    allersVersTerritorial: av,
    ...overrides,
  };
}

describe("getResponsableDossier", () => {
  it("retourne ARCHIVE si le parcours est archivé", () => {
    const result = getResponsableDossier(makeInput({ archivedAt: new Date() }));
    expect(result.type).toBe("ARCHIVE");
  });

  it("retourne ARCHIVE pour une validation LOGEMENT_NON_ELIGIBLE", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, entreprise },
      })
    );
    expect(result.type).toBe("ARCHIVE");
  });

  it("retourne ARCHIVE pour une validation ACCOMPAGNEMENT_REFUSE", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.ACCOMPAGNEMENT_REFUSE, entreprise },
      })
    );
    expect(result.type).toBe("ARCHIVE");
  });

  it("retourne AV pour une renonciation explicite (SANS_AMO)", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.SANS_AMO, entreprise: null },
      })
    );
    expect(result).toMatchObject({ type: "AV", structureId: "av-1", structureNom: "ADIL 36", codeDepartement: "36" });
  });

  it("retourne AV en pré-éligibilité (pas de validation AMO)", () => {
    const result = getResponsableDossier(makeInput({ validation: null }));
    expect(result.type).toBe("AV");
  });

  it("retourne AMO quand une validation EN_ATTENTE est posée", () => {
    const result = getResponsableDossier(
      makeInput({
        validation: { statut: StatutValidationAmo.EN_ATTENTE, entreprise },
      })
    );
    expect(result).toMatchObject({ type: "AMO", entrepriseId: "amo-1", entrepriseNom: "Entreprise A" });
  });

  it("retourne DDT pour une étape en instruction (validation acceptée)", () => {
    const result = getResponsableDossier(
      makeInput({
        currentStatus: Status.EN_INSTRUCTION,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entreprise },
      })
    );
    expect(result).toMatchObject({ type: "DDT", codeDepartement: "36" });
  });

  it("retourne MENAGE pour une étape TODO côté demandeur (validation acceptée)", () => {
    const result = getResponsableDossier(
      makeInput({
        currentStatus: Status.TODO,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entreprise },
      })
    );
    expect(result.type).toBe("MENAGE");
  });

  it("retourne MENAGE pour une étape validée (en attente de l'étape suivante)", () => {
    const result = getResponsableDossier(
      makeInput({
        currentStatus: Status.VALIDE,
        validation: { statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entreprise },
      })
    );
    expect(result.type).toBe("MENAGE");
  });

  it("fallback AV avec label générique quand aucun AV territorial n'est résolu", () => {
    const result = getResponsableDossier(makeInput({ allersVersTerritorial: null }));
    expect(result).toMatchObject({ type: "AV", structureId: null, structureNom: "Aller-vers du territoire" });
  });
});
