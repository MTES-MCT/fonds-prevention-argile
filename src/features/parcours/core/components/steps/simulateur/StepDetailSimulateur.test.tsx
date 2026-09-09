import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import StepDetailSimulateur from "./StepDetailSimulateur";
import * as parcoursContext from "../../../context/useParcours";

// Évite l'instanciation serveur des clients DS via les imports transitifs.
vi.mock("@/features/parcours/dossiers-ds/adapters/graphql/client", () => ({ graphqlClient: {} }));
vi.mock("@/features/parcours/dossiers-ds/adapters/rest/client", () => ({ prefillClient: {} }));
vi.mock("../../../context/useParcours", () => ({ useParcours: vi.fn() }));

const simulationEligible = {
  logement: {
    type: "maison",
    niveaux: 2,
    mitoyen: false,
    proprietaire_occupant: true,
    zone_dexposition: "fort",
    annee_de_construction: "2008",
    code_departement: "36",
    code_region: "24",
    commune: "36044",
  },
  rga: { sinistres: "saine", assure: true, indemnise_indemnise_rga: false, demande_catnat_en_cours: false },
  menage: { personnes: 4, revenu_rga: 30000 },
};

function mockParcours(rgaSimulationData: unknown, isQualifiedNonEligible = false) {
  vi.mocked(parcoursContext.useParcours).mockReturnValue({
    parcours: { rgaSimulationData, rgaSimulationCompletedAt: new Date("2026-09-20T10:00:00Z") },
    statutAmo: null,
    isQualifiedNonEligible,
  } as unknown as ReturnType<typeof parcoursContext.useParcours>);
}

describe("StepDetailSimulateur", () => {
  beforeEach(() => vi.clearAllMocks());

  it("date la validation de la simulation et annonce l'éligibilité", () => {
    mockParcours(simulationEligible);
    render(<StepDetailSimulateur />);

    expect(screen.getByText("Validé le 20/09/2026")).toBeInTheDocument();
    expect(screen.getByText("Vous êtes éligible.")).toBeInTheDocument();
  });

  it("mène toujours à l'écran de consultation et modification", () => {
    mockParcours(simulationEligible);
    render(<StepDetailSimulateur />);

    expect(screen.getByRole("link", { name: /Voir et modifier les données/ })).toHaveAttribute(
      "href",
      "/mon-compte/simulation"
    );
  });

  it("suit le verdict de la simulation enregistrée", () => {
    mockParcours({ ...simulationEligible, logement: { ...simulationEligible.logement, niveaux: 4 } });
    render(<StepDetailSimulateur />);

    expect(screen.getByText("Non éligible")).toBeInTheDocument();
    expect(screen.getByText("Vous n’êtes pas éligible.")).toBeInTheDocument();
  });

  it("suit aussi une qualification non éligible posée hors simulation", () => {
    mockParcours(simulationEligible, true);
    render(<StepDetailSimulateur />);

    expect(screen.getByText("Non éligible")).toBeInTheDocument();
  });
});
