import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { enregistrerAvisAction } from "../actions/avis.actions";
import { AvisSimulateur } from "./AvisSimulateur";

vi.mock("../actions/avis.actions", () => ({ enregistrerAvisAction: vi.fn() }));

const action = vi.mocked(enregistrerAvisAction);

describe("AvisSimulateur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    action.mockResolvedValue({ success: true, data: { avisId: "avis-1" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("enregistre un avis anonyme avec le résultat et le département au format officiel", async () => {
    const user = userEvent.setup();
    render(<AvisSimulateur simulationEligible={false} codeDepartement={3} />);

    await user.click(await screen.findByLabelText("Facile"));
    await user.click(screen.getByRole("button", { name: "Envoyer ma réponse" }));

    expect(action).toHaveBeenCalledWith({
      sujet: "simulateur",
      simulationEligible: false,
      codeDepartement: "03",
      note: 4,
      commentaire: undefined,
      origine: "en_direct",
    });
    expect(await screen.findByText("Merci pour votre aide !")).toBeInTheDocument();
  });

  it("n'envoie pas un département illisible, qui ferait refuser tout l'avis", async () => {
    const user = userEvent.setup();
    render(<AvisSimulateur simulationEligible codeDepartement="Indre" />);

    await user.click(await screen.findByLabelText("Correct"));
    await user.click(screen.getByRole("button", { name: "Envoyer ma réponse" }));

    expect(action.mock.calls[0][0]).toMatchObject({ codeDepartement: undefined });
  });

  it("ne repose pas la question à qui a déjà répondu", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AvisSimulateur simulationEligible />);
    await user.click(await screen.findByLabelText("Facile"));
    await user.click(screen.getByRole("button", { name: "Envoyer ma réponse" }));
    await screen.findByText("Merci pour votre aide !");
    unmount();

    render(<AvisSimulateur simulationEligible />);

    expect(screen.queryByText("Votre avis sur le simulateur")).not.toBeInTheDocument();
  });

  it("ne s'affiche pas dans l'iframe d'un partenaire", () => {
    vi.stubGlobal("parent", {});

    render(<AvisSimulateur simulationEligible />);

    expect(screen.queryByText("Votre avis sur le simulateur")).not.toBeInTheDocument();
  });
});
