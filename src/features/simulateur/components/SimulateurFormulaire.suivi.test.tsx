import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { SimulateurStep } from "../domain/value-objects/simulateur-step.enum";
import { useSimulateurStore } from "../stores/simulateur.store";
import { SimulateurProvider } from "./shared/SimulateurContext";
import { SimulateurFormulaire } from "./SimulateurFormulaire";

const trackEvent = vi.fn();
const etat = { currentStep: SimulateurStep.REVENUS as SimulateurStep, isEligible: true };

vi.mock("@/shared/components/Matomo/useMatomo", () => ({ useMatomo: () => ({ trackEvent }) }));
vi.mock("@/features/auth/client", () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock("@/features/parcours/core/actions/parcours-simulateur-rga-migration.actions", () => ({
  migrateSimulationDataToDatabase: vi.fn(),
}));
vi.mock("../actions/encrypt-rga-data.actions", () => ({ encryptRGAData: vi.fn() }));
vi.mock("./steps", () => ({
  StepIntro: () => null,
  StepTypeLogement: () => null,
  StepAdresse: () => null,
  StepCaracteristiques: () => null,
  StepEtatMaison: () => null,
  StepMitoyennete: () => null,
  StepIndemnisation: () => null,
  StepCatastrophesNaturelles: () => null,
  StepAssurance: () => null,
  StepProprietaire: () => null,
  StepRevenus: () => null,
}));
vi.mock("./results", () => ({ ResultEdition: () => null, ResultEligible: () => null, ResultNonEligible: () => null }));
vi.mock("../hooks/useSimulateurFormulaire", () => ({
  useSimulateurFormulaire: () => ({
    isLoading: false,
    currentStep: etat.currentStep,
    answers: useSimulateurStore.getState().simulation.answers,
    checks: {},
    numeroEtape: 1,
    totalEtapes: 10,
    canGoBack: true,
    isEligible: etat.isEligible,
    start: vi.fn(),
    submitAnswer: vi.fn(),
    goBack: vi.fn(),
    reset: vi.fn(),
    commitToRGAStore: vi.fn(),
  }),
}));

function poserReponses(codeDepartement: string) {
  useSimulateurStore.setState((s) => ({
    simulation: { ...s.simulation, answers: { logement: { code_departement: codeDepartement } } },
  }));
}

function parcourir(etapes: SimulateurStep[], onSave?: () => Promise<never>) {
  etat.currentStep = SimulateurStep.REVENUS;
  const ui = (cle: number) =>
    onSave ? (
      <SimulateurProvider key="p" onSave={onSave}>
        <SimulateurFormulaire key={cle} />
      </SimulateurProvider>
    ) : (
      <SimulateurFormulaire />
    );
  const { rerender } = render(ui(0));
  for (const etape of etapes) {
    etat.currentStep = etape;
    rerender(ui(0));
  }
}

const resultats = () => trackEvent.mock.calls.filter(([nom]) => String(nom).startsWith("simulateur_result"));

describe("SimulateurFormulaire — suivi du résultat", () => {
  beforeEach(() => {
    trackEvent.mockClear();
    window.scrollTo = vi.fn();
    sessionStorage.clear();
    useSimulateurStore.setState({ editMode: false });
    etat.isEligible = true;
  });

  it("nomme l'évènement de résultat avec le code département officiel", () => {
    poserReponses("3");

    parcourir([SimulateurStep.RESULTAT]);

    expect(resultats().map(([nom, dept]) => [nom, dept])).toEqual([["simulateur_result_eligible", "03"]]);
  });

  it("ne renvoie pas le résultat d'une simulation inchangée", () => {
    poserReponses("63");

    parcourir([SimulateurStep.RESULTAT, SimulateurStep.REVENUS, SimulateurStep.RESULTAT]);

    expect(resultats()).toHaveLength(1);
  });

  it("renvoie un résultat quand une réponse a changé", () => {
    poserReponses("63");
    parcourir([SimulateurStep.RESULTAT, SimulateurStep.ADRESSE]);
    poserReponses("75");
    etat.isEligible = false;
    etat.currentStep = SimulateurStep.RESULTAT;
    parcourir([SimulateurStep.RESULTAT]);

    expect(resultats().map(([nom, dept]) => [nom, dept])).toEqual([
      ["simulateur_result_eligible", "63"],
      ["simulateur_result_non_eligible", "75"],
    ]);
  });

  it("n'envoie rien en mode édition", () => {
    poserReponses("36");
    useSimulateurStore.setState({ editMode: true });

    parcourir([SimulateurStep.ADRESSE, SimulateurStep.RESULTAT]);

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("n'envoie rien sur un écran d'édition, même avant que le mode édition soit posé", () => {
    poserReponses("36");

    parcourir([SimulateurStep.ADRESSE, SimulateurStep.RESULTAT], vi.fn());

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
