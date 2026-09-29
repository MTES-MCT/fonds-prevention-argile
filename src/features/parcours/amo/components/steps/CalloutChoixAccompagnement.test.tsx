import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalloutChoixAccompagnement from "./CalloutChoixAccompagnement";
import { assignAmoAutomatique, getAmosDisponibles, skipAmoStep } from "../../actions";
import type { Amo } from "../../domain/entities";

vi.mock("../../actions", () => ({
  assignAmoAutomatique: vi.fn(),
  getAmosDisponibles: vi.fn(),
  skipAmoStep: vi.fn(),
}));

function amo(id: string, nom: string): Amo {
  return { id, nom, siret: "", departements: "Nord 59", emails: `${id}@example.org`, telephone: "", adresse: "" };
}

const ARGILES = amo("6a4403e5-1c9d-4e3e-b2b1-77ed657467a6", "Argiles du Nord");
const HABITAT = amo("dc467f8e-6bc5-408f-a263-1474b03387f9", "Habitat Cambrésis");

async function repondreOui() {
  await userEvent.click(await screen.findByLabelText("Oui, je souhaite être accompagné par un AMO"));
}

describe("CalloutChoixAccompagnement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assignAmoAutomatique).mockResolvedValue({ success: true, data: { message: "ok", token: "t" } });
    vi.mocked(skipAmoStep).mockResolvedValue({ success: true, data: { message: "ok" } });
  });

  it("attribue l'AMO unique du territoire sans rien demander de plus", async () => {
    vi.mocked(getAmosDisponibles).mockResolvedValue({ success: true, data: [HABITAT] });
    render(<CalloutChoixAccompagnement />);

    await repondreOui();
    expect(screen.queryByText(/choisissez la vôtre/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmer mon choix" }));

    expect(assignAmoAutomatique).toHaveBeenCalledWith(undefined);
  });

  describe("plusieurs AMO sur le territoire", () => {
    beforeEach(() => {
      vi.mocked(getAmosDisponibles).mockResolvedValue({ success: true, data: [ARGILES, HABITAT] });
    });

    it("propose de choisir parmi elles une fois l'accompagnement accepté", async () => {
      render(<CalloutChoixAccompagnement />);

      await repondreOui();

      expect(screen.getByText(/choisissez la vôtre/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Argiles du Nord/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Habitat Cambrésis/)).toBeInTheDocument();
    });

    it("n'envoie rien tant qu'aucune AMO n'est choisie", async () => {
      render(<CalloutChoixAccompagnement />);

      await repondreOui();
      await userEvent.click(screen.getByRole("button", { name: "Confirmer mon choix" }));

      expect(screen.getByText("Merci de choisir votre AMO")).toBeInTheDocument();
      expect(assignAmoAutomatique).not.toHaveBeenCalled();
    });

    it("sollicite l'AMO choisie", async () => {
      render(<CalloutChoixAccompagnement />);

      await repondreOui();
      await userEvent.click(screen.getByLabelText(/Habitat Cambrésis/));
      await userEvent.click(screen.getByRole("button", { name: "Confirmer mon choix" }));

      expect(assignAmoAutomatique).toHaveBeenCalledWith(HABITAT.id);
    });
  });

  it("ne fait pas passer en autonomie quand la liste des AMO n'a pas pu être lue", async () => {
    vi.mocked(getAmosDisponibles).mockResolvedValue({
      success: false,
      error: "Erreur lors de la récupération des AMO",
    });
    render(<CalloutChoixAccompagnement />);

    expect(await screen.findByText("Erreur lors de la récupération des AMO")).toBeInTheDocument();
    expect(skipAmoStep).not.toHaveBeenCalled();
  });

  it("passe en autonomie quand aucune AMO ne couvre le territoire", async () => {
    vi.mocked(getAmosDisponibles).mockResolvedValue({ success: true, data: [] });
    render(<CalloutChoixAccompagnement />);

    await vi.waitFor(() => expect(skipAmoStep).toHaveBeenCalled());
  });
});
