import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("../../actions/verifier-doublon-demandeur.action", () => ({ verifierEmailDemandeurAction: vi.fn() }));

import { StepContact } from "./StepContact";
import { useCreationDossierStore } from "../../stores/creation-dossier.store";
import { verifierEmailDemandeurAction } from "../../actions/verifier-doublon-demandeur.action";
import { presenterDoublon } from "../../domain/doublon";

const doublonCompte = presenterDoublon("compte", "/espace-agent/dossiers/v-1");

function preparer(email: string) {
  useCreationDossierStore.getState().reset();
  useCreationDossierStore.setState({ wantsSimulation: true, intent: "amo" });
  useCreationDossierStore.getState().updateDemandeur({ email });
}

describe("StepContact — demandeur déjà connu", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bloque sur un email connu, puis débloque quand l'agent le corrige", async () => {
    preparer("connu@example.org");
    vi.mocked(verifierEmailDemandeurAction).mockResolvedValue({ success: true, data: doublonCompte });
    render(<StepContact />);

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    expect(await screen.findByText("Ce demandeur est déjà connu")).toBeInTheDocument();
    // La transition peut finir après l'alerte : le bouton affiche « Chargement... » jusque-là.
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled());
    expect(push).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Adresse email/), { target: { value: "neuf@example.org" } });

    expect(screen.queryByText("Ce demandeur est déjà connu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeEnabled();
  });

  it("ignore la réponse d'une vérification devenue obsolète", async () => {
    preparer("connu@example.org");
    let repondre: (valeur: Awaited<ReturnType<typeof verifierEmailDemandeurAction>>) => void = () => {};
    vi.mocked(verifierEmailDemandeurAction).mockImplementation(() => new Promise((resolve) => (repondre = resolve)));
    render(<StepContact />);

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));
    await waitFor(() => expect(verifierEmailDemandeurAction).toHaveBeenCalledWith("connu@example.org"));
    act(() => useCreationDossierStore.getState().updateDemandeur({ email: "neuf@example.org" }));
    await act(async () => repondre({ success: true, data: doublonCompte }));

    expect(screen.queryByText("Ce demandeur est déjà connu")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("laisse passer un email inconnu vers la simulation", async () => {
    preparer("neuf@example.org");
    vi.mocked(verifierEmailDemandeurAction).mockResolvedValue({ success: true, data: null });
    render(<StepContact />);

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/espace-agent/dossiers/nouveau/simulation?intent=amo"));
  });

  it("laisse passer quand la vérification échoue : l'enregistrement refait le contrôle", async () => {
    preparer("neuf@example.org");
    vi.mocked(verifierEmailDemandeurAction).mockResolvedValue({ success: false, error: "Vérification impossible" });
    render(<StepContact />);

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => expect(push).toHaveBeenCalled());
  });
});
