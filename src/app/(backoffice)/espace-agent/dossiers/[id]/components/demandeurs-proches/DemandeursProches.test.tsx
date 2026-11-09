import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { DemandeursProches as Donnees } from "@/features/backoffice/espace-agent/demandeurs-proches/services/demandeurs-proches.service";

vi.mock("./CarteDemandeursProches", () => ({
  CarteDemandeursProches: ({ voisins }: { voisins: unknown[] }) => (
    <div data-testid="carte">{voisins.length} points</div>
  ),
}));

import { DemandeursProches } from "./DemandeursProches";

const ORIGINE = { lat: 46.81, lon: 1.69, approximative: false };

function voisin(rang: number, overrides: Partial<Donnees["voisins"][number]> = {}): Donnees["voisins"][number] {
  return {
    rang,
    nom: `Demandeur ${rang}`,
    commune: "Châteauroux",
    codeDepartement: "36",
    etape: "Diagnostic logement",
    chezLaDdt: false,
    distance: `${rang},2 km`,
    positionApproximative: false,
    lat: 46.8,
    lon: 1.7,
    href: `/espace-agent/dossiers/v${rang}`,
    ...overrides,
  };
}

function donnees(overrides: Partial<Donnees> = {}): Donnees {
  return { origine: ORIGINE, etapes: "au diagnostic ou en éligibilité", mesDossiers: true, voisins: [], ...overrides };
}

describe("DemandeursProches", () => {
  it("annonce qu'aucun dossier n'est à ce stade, sans carte", () => {
    render(<DemandeursProches donnees={donnees()} />);

    expect(screen.getByText("Aucun autre dossier à ce stade dans votre périmètre.")).toBeInTheDocument();
    expect(screen.queryByTestId("carte")).not.toBeInTheDocument();
  });

  it("liste les voisins dans l'ordre, avec leur commune et leur distance à vol d'oiseau", () => {
    render(<DemandeursProches donnees={donnees({ voisins: [voisin(1), voisin(2)] })} />);

    const liens = screen.getAllByRole("link");
    expect(liens.map((lien) => lien.textContent)).toEqual(["Demandeur 1", "Demandeur 2"]);
    expect(screen.getByText(/Châteauroux \(36\) · 1,2 km à vol d'oiseau/)).toBeInTheDocument();
    expect(screen.getByTestId("carte")).toHaveTextContent("2 points");
  });

  it("ouvre chaque dossier dans un nouvel onglet, sur sa fiche", () => {
    render(<DemandeursProches donnees={donnees({ voisins: [voisin(1, { href: "/espace-agent/demandes/v1" })] })} />);

    const lien = screen.getByRole("link", { name: "Demandeur 1" });
    expect(lien).toHaveAttribute("href", "/espace-agent/demandes/v1");
    expect(lien).toHaveAttribute("target", "_blank");
    expect(lien).toHaveAttribute("rel", "noopener");
  });

  it("signale un dossier chez la DDT et une position approximative", () => {
    render(
      <DemandeursProches
        donnees={donnees({ voisins: [voisin(1, { chezLaDdt: true, positionApproximative: true })] })}
      />
    );

    expect(screen.getByText("Chez la DDT")).toBeInTheDocument();
    expect(screen.getByText("Position approximative")).toBeInTheDocument();
  });

  it("parle des dossiers du périmètre à qui n'est responsable d'aucun", () => {
    render(<DemandeursProches donnees={donnees({ mesDossiers: false, voisins: [voisin(1)] })} />);

    expect(screen.getByText(/^Les dossiers de votre périmètre au diagnostic ou en éligibilité/)).toBeInTheDocument();
  });

  it("prévient quand le logement consulté n'est placé qu'au centre de sa commune", () => {
    render(<DemandeursProches donnees={donnees({ origine: { ...ORIGINE, approximative: true } })} />);

    expect(screen.getByText(/les distances sont approximatives/)).toBeInTheDocument();
  });
});
