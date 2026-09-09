import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfirmationSaveModal } from "./ConfirmationSaveModal";

// Le <dialog> DSFR n'est pas ouvert par jsdom (pas de `window.dsfr`) : ses noeuds
// existent mais sont inaccessibles, d'où les requêtes par texte plutôt que par rôle.
const props = { isOpen: true, onClose: vi.fn(), onConfirm: vi.fn() };

describe("ConfirmationSaveModal", () => {
  it("garde la formulation agent par défaut", () => {
    render(<ConfirmationSaveModal {...props} isIneligible />);

    expect(screen.getByText(/rendent la demande inéligible/)).toBeInTheDocument();
    expect(screen.getByText("Confirmer l'inéligibilité")).toBeInTheDocument();
  });

  it("s'adresse au demandeur quand ses modifications le rendent inéligible", () => {
    render(<ConfirmationSaveModal {...props} isIneligible audience="demandeur" />);

    expect(screen.getByText(/Confirmer l’inéligibilité \?/)).toBeInTheDocument();
    expect(screen.getByText(/vous ne pourrez plus bénéficier de l'aide/)).toBeInTheDocument();
    expect(screen.getByText("Je confirme")).toBeInTheDocument();
    // Les conséquences côté back-office ne le concernent pas.
    expect(screen.queryByText(/catégorie "Archivés"/)).not.toBeInTheDocument();
  });

  it("reste sobre quand le demandeur enregistre en restant éligible", () => {
    render(<ConfirmationSaveModal {...props} audience="demandeur" />);

    expect(screen.getByText(/Confirmer la mise à jour de vos données \?/)).toBeInTheDocument();
    expect(screen.queryByText(/inéligible/)).not.toBeInTheDocument();
  });
});
