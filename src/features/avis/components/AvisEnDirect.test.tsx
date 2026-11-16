import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { enregistrerAvisAction } from "../actions/avis.actions";
import { AvisEnDirect } from "./AvisEnDirect";

vi.mock("../actions/avis.actions", () => ({ enregistrerAvisAction: vi.fn() }));

const action = vi.mocked(enregistrerAvisAction);

describe("AvisEnDirect", () => {
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
    render(<AvisEnDirect sujet="simulateur" simulationEligible={false} codeDepartement={3} />);

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
    render(<AvisEnDirect sujet="simulateur" simulationEligible codeDepartement="Indre" />);

    await user.click(await screen.findByLabelText("Correct"));
    await user.click(screen.getByRole("button", { name: "Envoyer ma réponse" }));

    expect(action.mock.calls[0][0]).toMatchObject({ codeDepartement: undefined });
  });

  it("ne repose pas la question à qui a déjà répondu", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AvisEnDirect sujet="simulateur" simulationEligible />);
    await user.click(await screen.findByLabelText("Facile"));
    await user.click(screen.getByRole("button", { name: "Envoyer ma réponse" }));
    await screen.findByText("Merci pour votre aide !");
    unmount();

    render(<AvisEnDirect sujet="simulateur" simulationEligible />);

    expect(screen.queryByText("Votre avis sur le simulateur")).not.toBeInTheDocument();
  });

  it("ne s'affiche pas dans l'iframe d'un partenaire", () => {
    vi.stubGlobal("parent", {});

    render(<AvisEnDirect sujet="simulateur" simulationEligible />);

    expect(screen.queryByText("Votre avis sur le simulateur")).not.toBeInTheDocument();
  });

  it("demande l'avis sur le simulateur de vulnérabilité, sans résultat d'éligibilité", async () => {
    const user = userEvent.setup();
    render(<AvisEnDirect sujet="vulnerabilite" codeDepartement="36" />);

    expect(await screen.findByText("Le simulateur de vulnérabilité était :")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Correct"));
    await user.click(screen.getByRole("button", { name: "Envoyer ma réponse" }));

    expect(action.mock.calls[0][0]).toMatchObject({ sujet: "vulnerabilite", codeDepartement: "36", note: 3 });
    expect(action.mock.calls[0][0]).toMatchObject({ simulationEligible: undefined });
  });

  it("garde un marqueur par simulateur : répondre sur l'un ne masque pas l'autre", async () => {
    window.localStorage.setItem("fpa-avis-simulateur", "2026-11-16");

    render(<AvisEnDirect sujet="vulnerabilite" />);

    expect(await screen.findByText("Votre avis sur le simulateur de vulnérabilité")).toBeInTheDocument();
  });
});
