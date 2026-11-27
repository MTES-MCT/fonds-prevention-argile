import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ComprendreLeRgaPage from "./page";

const active = vi.hoisted(() => vi.fn(() => true));
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  })
);

vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: active,
}));

vi.mock("next/navigation", () => ({ notFound }));

describe("page « Ma maison est-elle vulnérable au RGA ? »", () => {
  beforeEach(() => {
    active.mockReturnValue(true);
    notFound.mockClear();
  });

  it("reprend les trois temps de l'infographie", () => {
    render(<ComprendreLeRgaPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Ma maison est-elle vulnérable au phénomène RGA ?" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /^1\.\s*Le sol$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /^2\.\s*La maison$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /^3\.\s*L'environnement proche$/ })).toBeInTheDocument();
  });

  it("mène au simulateur de vulnérabilité en haut et en bas de page", () => {
    render(<ComprendreLeRgaPage />);

    const liens = screen.getAllByRole("link", { name: /Estimer la vulnérabilité de mon logement/ });

    expect(liens).toHaveLength(2);
    liens.forEach((lien) => expect(lien).toHaveAttribute("href", "/vulnerabilite-rga"));
  });

  it("renvoie vers le simulateur d'éligibilité pour les aides", () => {
    render(<ComprendreLeRgaPage />);

    expect(screen.getByRole("link", { name: "Vérifier mon éligibilité aux aides" })).toHaveAttribute(
      "href",
      "/simulateur"
    );
  });

  it("répond 404 quand le simulateur de vulnérabilité est désactivé, comme en production", () => {
    active.mockReturnValue(false);

    expect(() => render(<ComprendreLeRgaPage />)).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});
