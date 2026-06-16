import { describe, it, expect } from "vitest";
import { getDossierForStep, getStepDsStatus } from "./dossier-step.utils";
import { Step } from "../../core/domain/value-objects/step";
import { DSStatus } from "../domain/value-objects/ds-status";
import type { DossierDS } from "../domain/entities/dossier-ds";

function dossier(step: Step, etatDs: DSStatus | null): DossierDS {
  return { demarcheEtape: step, etatDs } as DossierDS;
}

describe("getStepDsStatus", () => {
  it("retourne le statut du dossier de l'étape demandée", () => {
    const dossiers = [dossier(Step.ELIGIBILITE, DSStatus.ACCEPTE)];
    expect(getStepDsStatus(dossiers, Step.ELIGIBILITE)).toBe(DSStatus.ACCEPTE);
  });

  it("retourne null quand l'étape n'a pas encore de dossier (anti-débordement sur l'étape suivante)", () => {
    const dossiers = [dossier(Step.ELIGIBILITE, DSStatus.ACCEPTE)];
    expect(getStepDsStatus(dossiers, Step.DIAGNOSTIC)).toBeNull();
  });

  it("retourne null quand le dossier existe mais sans statut (créé, non déposé)", () => {
    const dossiers = [dossier(Step.DIAGNOSTIC, null)];
    expect(getStepDsStatus(dossiers, Step.DIAGNOSTIC)).toBeNull();
  });

  it("retourne null quand step est null", () => {
    expect(getStepDsStatus([dossier(Step.ELIGIBILITE, DSStatus.ACCEPTE)], null)).toBeNull();
  });
});

describe("getDossierForStep", () => {
  it("trouve le dossier rattaché à l'étape", () => {
    const elig = dossier(Step.ELIGIBILITE, DSStatus.EN_INSTRUCTION);
    expect(getDossierForStep([elig], Step.ELIGIBILITE)).toBe(elig);
  });

  it("retourne undefined si aucun dossier pour l'étape", () => {
    expect(getDossierForStep([], Step.ELIGIBILITE)).toBeUndefined();
  });
});
