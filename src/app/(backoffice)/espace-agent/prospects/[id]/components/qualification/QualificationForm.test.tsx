import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QualificationForm } from "./QualificationForm";

vi.mock("@/features/backoffice/espace-agent/prospects/actions/qualify-prospect.actions", () => ({
  qualifyProspectAction: vi.fn(),
}));

const DEUX_AMO = [
  { id: "6a4403e5-1c9d-4e3e-b2b1-77ed657467a6", nom: "Argiles du Nord" },
  { id: "dc467f8e-6bc5-408f-a263-1474b03387f9", nom: "Habitat Cambrésis" },
];

function afficher(amosTerritoire: { id: string; nom: string }[], amoObligatoire = false) {
  render(
    <QualificationForm
      parcoursId="11111111-1111-4111-8111-111111111111"
      amoObligatoire={amoObligatoire}
      amosTerritoire={amosTerritoire}
      onSuccess={vi.fn()}
    />
  );
}

async function qualifierEligibleAvecAccompagnement() {
  await userEvent.click(screen.getByLabelText(/Éligible et peut passer/));
  await userEvent.click(screen.getByLabelText("Non"));
  await userEvent.click(screen.getByLabelText("Oui, il souhaite être accompagné par un AMO"));
}

describe("QualificationForm — AMO à solliciter", () => {
  it("demande laquelle solliciter quand plusieurs AMO couvrent le territoire", async () => {
    afficher(DEUX_AMO);

    await qualifierEligibleAvecAccompagnement();

    expect(screen.getByText("Quelle AMO solliciter ?")).toBeInTheDocument();
    expect(screen.getByLabelText("Argiles du Nord")).toBeInTheDocument();
    expect(screen.getByLabelText("Habitat Cambrésis")).toBeInTheDocument();
  });

  it("refuse d'enregistrer sans AMO désignée", async () => {
    afficher(DEUX_AMO);

    await qualifierEligibleAvecAccompagnement();
    await userEvent.click(screen.getByRole("button", { name: /Enregistrer/ }));

    expect(screen.getByText("Veuillez indiquer l'AMO à solliciter.")).toBeInTheDocument();
  });

  it("ne pose pas la question avec une seule AMO", async () => {
    afficher([DEUX_AMO[0]]);

    await qualifierEligibleAvecAccompagnement();

    expect(screen.queryByText("Quelle AMO solliciter ?")).not.toBeInTheDocument();
  });

  it("ne pose pas la question quand le demandeur poursuit seul", async () => {
    afficher(DEUX_AMO);

    await userEvent.click(screen.getByLabelText(/Éligible et peut passer/));
    await userEvent.click(screen.getByLabelText("Non, il gère ses démarches seul"));

    expect(screen.queryByText("Quelle AMO solliciter ?")).not.toBeInTheDocument();
  });

  it("la pose aussi là où l'AMO est imposée, dès la décision éligible", async () => {
    afficher(DEUX_AMO, true);

    await userEvent.click(screen.getByLabelText(/Éligible et peut passer/));

    expect(screen.getByText("Quelle AMO solliciter ?")).toBeInTheDocument();
  });
});
