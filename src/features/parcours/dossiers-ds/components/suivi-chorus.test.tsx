import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NumeroDossierDn } from "./NumeroDossierDn";
import { ReferenceChorusCell } from "./ReferenceChorusCell";
import { SuiviChorusAgent } from "./SuiviChorusAgent";
import type { SuiviChorus } from "../domain/value-objects/suivi-chorus";

const date = new Date("2026-09-22T10:00:00Z");
const complet: SuiviChorus = {
  tiersFournisseur: { valeur: "4521", renseigneAt: date },
  numeroEj: { valeur: "2100456789", renseigneAt: date },
  montantSubvention: { valeur: 1250, renseigneAt: date },
};

describe("ReferenceChorusCell", () => {
  it("affiche le tiers fournisseur et l'EJ quand les deux sont renseignés", () => {
    render(<ReferenceChorusCell suivi={complet} />);
    expect(screen.getByText("4521")).toBeInTheDocument();
    expect(screen.getByText("2100456789")).toBeInTheDocument();
  });

  it("n'affiche que le tiers quand l'EJ manque", () => {
    render(<ReferenceChorusCell suivi={{ ...complet, numeroEj: null, montantSubvention: null }} />);
    expect(screen.getByText("4521")).toBeInTheDocument();
    expect(screen.queryByText(/EJ/)).not.toBeInTheDocument();
  });

  it("affiche un tiret sans aucune référence", () => {
    render(<ReferenceChorusCell suivi={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("SuiviChorusAgent", () => {
  it("ne rend rien tant que la DDT n'a rien saisi", () => {
    const { container } = render(<SuiviChorusAgent suivi={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche les trois valeurs avec leur date de détection", () => {
    render(<SuiviChorusAgent suivi={complet} />);
    expect(screen.getByText("Suivi Chorus")).toBeInTheDocument();
    expect(screen.getByText("2100456789")).toBeInTheDocument();
    expect(screen.getAllByText(/renseigné le 22\/09\/2026/)).toHaveLength(3);
  });
});

describe("NumeroDossierDn", () => {
  it("affiche le numéro de dossier", () => {
    render(<NumeroDossierDn numero={24819365} />);
    expect(screen.getByText("24819365")).toBeInTheDocument();
  });

  it("ne rend rien sans dossier", () => {
    const { container } = render(<NumeroDossierDn numero={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
