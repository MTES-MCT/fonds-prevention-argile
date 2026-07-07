import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PiecesAPrevoir from "./PiecesAPrevoir";
import type { PieceJustificative } from "@/features/parcours/dossiers-ds/domain/pieces-justificatives";

const pieces: PieceJustificative[] = [
  {
    id: "p1",
    label: "Pièce d'identité",
    required: true,
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

describe("PiecesAPrevoir", () => {
  it("ne rend rien sans pièce", () => {
    const { container } = render(<PiecesAPrevoir pieces={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche le compteur, les libellés, l'aide, le modèle et les liens", () => {
    render(<PiecesAPrevoir pieces={pieces} />);

    expect(screen.getByText(/Préparez les pièces nécessaires \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("CNI ou passeport en cours de validité.")).toBeInTheDocument();

    const modele = screen.getByRole("link", { name: /Télécharger le modèle/ });
    expect(modele).toHaveAttribute("href", "https://dn/cerfa.pdf");

    expect(screen.getByRole("link", { name: "service-public" })).toHaveAttribute(
      "href",
      "https://service-public.fr/cerfa"
    );
  });
});
