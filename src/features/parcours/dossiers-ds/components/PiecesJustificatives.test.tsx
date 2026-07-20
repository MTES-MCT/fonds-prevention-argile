import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PiecesJustificatives } from "./PiecesJustificatives";
import type { PieceJustificative } from "@/features/parcours/dossiers-ds/domain/pieces-justificatives";

const pieces: PieceJustificative[] = [
  {
    id: "p1",
    label: "Pièce d'identité",
    required: true,
    description: "Recto verso.",
    aide: { texte: "CNI ou passeport en cours de validité." },
  },
  {
    id: "p2",
    label: "CERFA mandat",
    required: false,
    modele: { filename: "cerfa.pdf", url: "https://dn/cerfa.pdf" },
    aide: { liens: [{ label: "service-public", href: "https://service-public.fr/cerfa" }] },
  },
];

describe("PiecesJustificatives", () => {
  it("ne rend rien sans pièce", () => {
    const { container } = render(<PiecesJustificatives pieces={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien si les pièces sont indéfinies", () => {
    const { container } = render(<PiecesJustificatives />);
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche les libellés, le badge obligatoire, la description, l'aide, le modèle et les liens", () => {
    render(<PiecesJustificatives pieces={pieces} stepLabel="2. Éligibilité" />);

    expect(screen.getByText("Pièce d'identité")).toBeInTheDocument();
    expect(screen.getByText("Obligatoire")).toBeInTheDocument();
    expect(screen.getByText("Recto verso.")).toBeInTheDocument();
    expect(screen.getByText("CNI ou passeport en cours de validité.")).toBeInTheDocument();
    expect(screen.getByText(/2\. Éligibilité/)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /Télécharger le modèle/ })).toHaveAttribute("href", "https://dn/cerfa.pdf");
    expect(screen.getByRole("link", { name: "service-public" })).toHaveAttribute(
      "href",
      "https://service-public.fr/cerfa"
    );
  });

  it("utilise le titre par défaut, surchargeable côté demandeur", () => {
    const { rerender } = render(<PiecesJustificatives pieces={pieces} />);
    expect(screen.getByText("Pièces justificatives à prévoir")).toBeInTheDocument();

    rerender(<PiecesJustificatives pieces={pieces} titre="Les pièces à préparer dès maintenant" />);
    expect(screen.getByText("Les pièces à préparer dès maintenant")).toBeInTheDocument();
  });
});
