import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { enregistrerAvisAction } from "../actions/avis.actions";
import { FormulaireAvis } from "./FormulaireAvis";

vi.mock("../actions/avis.actions", () => ({ enregistrerAvisAction: vi.fn() }));

const action = vi.mocked(enregistrerAvisAction);
const PARCOURS_ID = "5b2f6f0e-8a57-4c59-9d0b-0f3c1c7d2a11";
const etape = { sujet: "diagnostic", parcoursId: PARCOURS_ID } as const;

describe("FormulaireAvis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    action.mockResolvedValue({ success: true, data: { avisId: null } });
  });

  it("enregistre dès l'affichage la note cliquée dans le mail", async () => {
    render(<FormulaireAvis cible={etape} origine="mail" noteInitiale={4} />);

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action).toHaveBeenCalledWith({ ...etape, note: 4, commentaire: undefined, origine: "mail" });
    expect(await screen.findByText(/Votre réponse « Facile » est enregistrée/)).toBeInTheDocument();
    expect(screen.getByLabelText("Facile")).toBeChecked();
  });

  it("n'enregistre rien tant qu'aucune note n'est choisie", () => {
    render(<FormulaireAvis cible={etape} origine="mail" />);

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Envoyer ma réponse" })).toBeDisabled();
    expect(screen.getByText("L'étape du diagnostic était :")).toBeInTheDocument();
  });

  it("ne demande pourquoi que pour une note difficile, et envoie le commentaire", async () => {
    const user = userEvent.setup();
    render(<FormulaireAvis cible={etape} origine="mail" />);

    await user.click(screen.getByLabelText("Facile"));
    expect(screen.queryByLabelText(/Qu'est-ce qui a posé problème/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Très difficile"));
    await user.type(screen.getByLabelText(/Qu'est-ce qui a posé problème/), "Trop de pièces");
    await user.click(screen.getByRole("button", { name: "Envoyer ma réponse" }));

    expect(action).toHaveBeenCalledWith({ ...etape, note: 1, commentaire: "Trop de pièces", origine: "mail" });
    expect(await screen.findByText("Merci pour votre aide !")).toBeInTheDocument();
  });

  it("affiche l'erreur et laisse réessayer quand l'enregistrement échoue", async () => {
    action.mockResolvedValue({ success: false, error: "Votre réponse n'a pas pu être enregistrée." });
    const user = userEvent.setup();
    render(<FormulaireAvis cible={etape} origine="mail" />);

    await user.click(screen.getByLabelText("Correcte"));
    await user.click(screen.getByRole("button", { name: "Envoyer ma réponse" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("n'a pas pu être enregistrée");
    expect(screen.getByRole("button", { name: "Envoyer ma réponse" })).toBeEnabled();
  });

  it("complète l'avis anonyme du simulateur au lieu d'en créer un second", async () => {
    action.mockResolvedValue({ success: true, data: { avisId: "avis-1" } });
    const user = userEvent.setup();
    render(
      <FormulaireAvis cible={{ sujet: "simulateur", simulationEligible: true }} origine="en_direct" noteInitiale={2} />
    );

    expect(screen.getByText("Ce simulateur a-t-il été facile ou difficile à utiliser ?")).toBeInTheDocument();
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await user.click(await screen.findByRole("button", { name: "Mettre à jour ma réponse" }));

    expect(action).toHaveBeenLastCalledWith(
      expect.objectContaining({ sujet: "simulateur", avisId: "avis-1", note: 2 })
    );
  });
});
