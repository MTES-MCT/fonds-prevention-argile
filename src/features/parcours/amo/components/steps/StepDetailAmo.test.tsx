import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import StepDetailAmo from "./StepDetailAmo";
import { Step } from "../../../core/domain";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";

import * as parcoursContext from "../../../core/context/useParcours";
import * as amoHooks from "@/features/parcours/amo/hooks";

// Évite l'instanciation serveur des clients DS via les imports transitifs.
vi.mock("@/features/parcours/dossiers-ds/adapters/graphql/client", () => ({ graphqlClient: {} }));
vi.mock("@/features/parcours/dossiers-ds/adapters/rest/client", () => ({ prefillClient: {} }));

vi.mock("../../../core/context/useParcours", () => ({ useParcours: vi.fn() }));
vi.mock("@/features/parcours/amo/hooks", () => ({ useReglesAmo: vi.fn() }));

function mockParcours(
  currentStep: Step,
  statutAmo: StatutValidationAmo | null,
  validationAmoComplete: unknown = null,
  isDossierNonEligible = false
) {
  vi.mocked(parcoursContext.useParcours).mockReturnValue({
    currentStep,
    statutAmo,
    validationAmoComplete,
    isDossierNonEligible,
  } as unknown as ReturnType<typeof parcoursContext.useParcours>);
}

describe("StepDetailAmo — badge « A faire »", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(amoHooks.useReglesAmo).mockReturnValue({ amoObligatoire: true, avCumuleAmo: false });
  });

  it("affiche « A faire » à l'étape choix_amo sans validation", () => {
    mockParcours(Step.CHOIX_AMO, null);
    render(<StepDetailAmo />);
    expect(screen.getByText("A faire")).toBeInTheDocument();
  });

  it("n'affiche PAS « A faire » au-delà de choix_amo même si statutAmo est transitoirement null (anti-flash)", () => {
    mockParcours(Step.ELIGIBILITE, null);
    render(<StepDetailAmo />);
    expect(screen.queryByText("A faire")).not.toBeInTheDocument();
  });

  it("affiche « Validé le » quand l'AMO est validée (jamais « A faire »)", () => {
    mockParcours(Step.ELIGIBILITE, StatutValidationAmo.LOGEMENT_ELIGIBLE, {
      choisieAt: new Date("2026-06-16"),
    });
    render(<StepDetailAmo />);
    expect(screen.getByText(/Validé le/)).toBeInTheDocument();
    expect(screen.queryByText("A faire")).not.toBeInTheDocument();
  });
});

describe("StepDetailAmo — logement non éligible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(amoHooks.useReglesAmo).mockReturnValue({ amoObligatoire: false, avCumuleAmo: false });
  });

  it("grise la carte sur une qualification non éligible, alors que statutAmo est null", () => {
    mockParcours(Step.CHOIX_AMO, null, null, true);
    render(<StepDetailAmo />);

    expect(screen.getByText("Non éligible")).toBeInTheDocument();
    expect(screen.queryByText("A faire")).not.toBeInTheDocument();
    expect(screen.queryByText("Choisir mon AMO")).not.toBeInTheDocument();
  });

  it("ne présente plus l'autonomie comme validée quand le logement devient non éligible", () => {
    mockParcours(Step.ELIGIBILITE, StatutValidationAmo.SANS_AMO, null, true);
    render(<StepDetailAmo />);

    expect(screen.getByText("Non éligible")).toBeInTheDocument();
    expect(screen.queryByText("Validé")).not.toBeInTheDocument();
    expect(screen.queryByText(/sans accompagnement/)).not.toBeInTheDocument();
  });

  it("garde le badge « Non éligible » sur une décision AMO (comportement existant)", () => {
    mockParcours(Step.CHOIX_AMO, StatutValidationAmo.LOGEMENT_NON_ELIGIBLE);
    render(<StepDetailAmo />);

    expect(screen.getByText("Non éligible")).toBeInTheDocument();
    expect(screen.queryByText("Choisir mon AMO")).not.toBeInTheDocument();
  });
});
