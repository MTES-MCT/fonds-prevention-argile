import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { PiecesJustificatives } from "./PiecesJustificatives";
import type { PieceJustificative } from "@/features/parcours/dossiers-ds/domain/pieces-justificatives";

const pieces: PieceJustificative[] = [
  {
    id: "p1",
    label: "Pièce d'identité",
    required: true,
    categorie: "DEMANDEUR",
    description: "Recto verso.",
  },
  {
    id: "p2",
    label: "CERFA mandat",
    required: false,
    categorie: "AMO_EXPERT",
    condition: { libelle: "Uniquement si demandeur accompagné" },
    modele: { filename: "cerfa.pdf", url: "https://dn/cerfa.pdf" },
  },
  { id: "p3", label: "Attestation d'assurance habitation", required: true, categorie: "ASSURANCE" },
  { id: "p4", label: "Plan cadastral", required: false, categorie: "AUTRES" },
];

function sectionDe(libelle: string): HTMLElement {
  const section = screen.getByRole("button", { name: libelle }).closest("section");
  if (!section) throw new Error(`Accordéon « ${libelle} » introuvable`);
  return section;
}

describe("PiecesJustificatives", () => {
  it("ne rend rien sans pièce", () => {
    const { container } = render(<PiecesJustificatives pieces={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ne rend rien si les pièces sont indéfinies", () => {
    const { container } = render(<PiecesJustificatives />);
    expect(container).toBeEmptyDOMElement();
  });

  it("annonce la règle d'obligation et l'étape", () => {
    render(<PiecesJustificatives pieces={pieces} stepLabel="2. Éligibilité" />);

    expect(screen.getByText("Sauf mention contraire, toutes les pièces sont obligatoires")).toBeInTheDocument();
    expect(screen.getByText(/2\. Éligibilité/)).toBeInTheDocument();
  });

  it("regroupe les pièces en accordéons ouverts, dans l'ordre de la maquette", () => {
    render(<PiecesJustificatives pieces={pieces} />);

    const boutons = screen.getAllByRole("button");
    expect(boutons.map((b) => b.textContent)).toEqual([
      "Pièces liées au demandeur (ou son mandataire)",
      "Pièces liées à l'assurance",
      "Pièces liées à l'AMO et l'Expert",
      "Autres pièces",
    ]);
    for (const bouton of boutons) {
      expect(bouton).toHaveAttribute("aria-expanded", "true");
      expect(document.getElementById(bouton.getAttribute("aria-controls") ?? "")).not.toBeNull();
    }
  });

  it("range chaque pièce dans son accordéon, y compris une pièce non reconnue", () => {
    render(<PiecesJustificatives pieces={pieces} />);

    expect(
      within(sectionDe("Pièces liées à l'assurance")).getByText("Attestation d'assurance habitation")
    ).toBeInTheDocument();
    expect(within(sectionDe("Autres pièces")).getByText("Plan cadastral")).toBeInTheDocument();
  });

  it("n'affiche pas d'accordéon quand toutes les pièces sont dans le même groupe", () => {
    render(<PiecesJustificatives pieces={[pieces[0]]} />);

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Pièce d'identité")).toBeInTheDocument();
  });

  it("n'affiche une mention que pour les exceptions à l'obligation", () => {
    render(<PiecesJustificatives pieces={pieces} />);

    expect(screen.getByText("Uniquement si demandeur accompagné")).toBeInTheDocument();
    expect(within(sectionDe("Autres pièces")).getByText("Facultatif")).toBeInTheDocument();
    expect(within(sectionDe("Pièces liées à l'assurance")).queryByText("Facultatif")).toBeNull();
    expect(screen.queryByText("Obligatoire")).toBeNull();
  });

  it("affiche la description DN et le modèle, sans texte ajouté par l'application", () => {
    render(<PiecesJustificatives pieces={pieces} />);

    expect(screen.getByText("Recto verso.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Télécharger le modèle/ })).toHaveAttribute("href", "https://dn/cerfa.pdf");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("conserve les retours à la ligne de la description DN", () => {
    const description = "Si plusieurs foyers fiscaux :\n- un avis par foyer\n- ou l'avis de situation déclarative";
    render(<PiecesJustificatives pieces={[{ ...pieces[0], description }]} />);

    const paragraphe = screen.getByText(/Si plusieurs foyers fiscaux/);
    expect(paragraphe).toHaveClass("whitespace-pre-line");
    expect(paragraphe.textContent).toBe(description);
  });

  it("utilise le titre par défaut, surchargeable côté demandeur", () => {
    const { rerender } = render(<PiecesJustificatives pieces={pieces} />);
    expect(screen.getByText("Pièces justificatives à prévoir")).toBeInTheDocument();

    rerender(<PiecesJustificatives pieces={pieces} titre="Pièces justificatives à préparer dès maintenant" />);
    expect(screen.getByText("Pièces justificatives à préparer dès maintenant")).toBeInTheDocument();
  });
});
