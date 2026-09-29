import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemanderAccompagnementModal } from "./DemanderAccompagnementModal";
import { demanderMonAccompagnement } from "../../actions/demande-accompagnement.actions";
import { getAmosDisponibles } from "../../actions/amo-disponibles.actions";
import type { Amo } from "../../domain/entities";

vi.mock("../../actions/demande-accompagnement.actions", () => ({ demanderMonAccompagnement: vi.fn() }));
vi.mock("../../actions/amo-disponibles.actions", () => ({ getAmosDisponibles: vi.fn() }));
vi.mock("@/shared/hooks", () => ({ useDsfrModal: vi.fn() }));

function amo(id: string, nom: string): Amo {
  return { id, nom, siret: "", departements: "Nord 59", emails: "", telephone: "", adresse: "" };
}

const CONFIRMER = { name: "Demander à être accompagné", hidden: true };

describe("DemanderAccompagnementModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dit que la liste des AMO n'a pas pu être chargée", async () => {
    vi.mocked(getAmosDisponibles).mockResolvedValue({
      success: false,
      error: "Erreur lors de la récupération des AMO",
    });
    render(<DemanderAccompagnementModal isOpen onClose={vi.fn()} />);

    expect(await screen.findByText("Erreur lors de la récupération des AMO")).toBeInTheDocument();
  });

  it("exige un choix quand plusieurs AMO couvrent le territoire", async () => {
    vi.mocked(getAmosDisponibles).mockResolvedValue({
      success: true,
      data: [amo("a", "Argiles du Nord"), amo("b", "Habitat Cambrésis")],
    });
    render(<DemanderAccompagnementModal isOpen onClose={vi.fn()} />);

    await screen.findByLabelText(/Argiles du Nord/);
    await userEvent.click(screen.getByRole("button", CONFIRMER));

    expect(screen.getByText("Merci de choisir votre AMO")).toBeInTheDocument();
    expect(demanderMonAccompagnement).not.toHaveBeenCalled();
  });

  it("oublie le choix précédent à la réouverture", async () => {
    vi.mocked(getAmosDisponibles).mockResolvedValue({
      success: true,
      data: [amo("a", "Argiles du Nord"), amo("b", "Habitat Cambrésis")],
    });
    const { rerender } = render(<DemanderAccompagnementModal isOpen onClose={vi.fn()} />);
    await userEvent.click(await screen.findByLabelText(/Habitat Cambrésis/));

    rerender(<DemanderAccompagnementModal isOpen={false} onClose={vi.fn()} />);
    rerender(<DemanderAccompagnementModal isOpen onClose={vi.fn()} />);

    await vi.waitFor(() => expect(screen.getByLabelText(/Habitat Cambrésis/)).not.toBeChecked());
  });
});
