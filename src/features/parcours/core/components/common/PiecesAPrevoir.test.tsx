import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PiecesAPrevoir from "./PiecesAPrevoir";
import type { PieceJustificative } from "@/features/parcours/dossiers-ds/domain/pieces-justificatives";

const pieces: PieceJustificative[] = [
  {
    id: "p1",
    label: "Pièce d'identité",
    required: true,
    categorie: "DEMANDEUR",
  },
  {
    id: "p2",
    label: "CERFA mandat",
    required: false,
    categorie: "AMO_EXPERT",
    modele: { filename: "cerfa.pdf", url: "https://dn/cerfa.pdf" },
  },
];

describe("PiecesAPrevoir", () => {
  it("ne rend rien sans pièce", () => {
    const { container } = render(<PiecesAPrevoir pieces={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche le compteur et le modèle, sans lien ajouté par l'application", () => {
    render(<PiecesAPrevoir pieces={pieces} />);

    expect(screen.getByText(/Préparez les pièces nécessaires \(2\)/)).toBeInTheDocument();

    const modele = screen.getByRole("link", { name: /Télécharger le modèle/ });
    expect(modele).toHaveAttribute("href", "https://dn/cerfa.pdf");

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("ne met d'astérisque que sur les pièces obligatoires sans condition", () => {
    const conditionnelle: PieceJustificative = {
      id: "p3",
      label: "Attestation indivision",
      required: true,
      categorie: "DEMANDEUR",
      condition: { libelle: "Obligatoire uniquement si indivision" },
    };
    render(<PiecesAPrevoir pieces={[...pieces, conditionnelle]} />);

    expect(screen.getByText("Pièce d'identité *")).toBeInTheDocument();
    expect(screen.getByText("Attestation indivision")).toBeInTheDocument();
  });
});
