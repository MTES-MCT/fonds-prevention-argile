import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LogementConcerneRgaSection from "./LogementConcerneRgaSection";

const active = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: active,
}));

describe("LogementConcerneRgaSection : premier CTA de la page", () => {
  beforeEach(() => {
    active.mockReturnValue(true);
  });

  it("garde le CTA d'éligibilité et ajoute le lien vers le simulateur de vulnérabilité", () => {
    render(<LogementConcerneRgaSection />);

    expect(screen.getByRole("link", { name: /Vérifier mon éligibilité/ })).toHaveAttribute("href", "/simulateur");
    expect(screen.getByRole("link", { name: /Estimer la vulnérabilité de mon logement/ })).toHaveAttribute(
      "href",
      "/vulnerabilite-rga"
    );
  });

  it("n'affiche que le CTA d'éligibilité quand le simulateur de vulnérabilité est désactivé", () => {
    active.mockReturnValue(false);
    render(<LogementConcerneRgaSection />);

    expect(screen.getByRole("link", { name: /Vérifier mon éligibilité/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /vulnérabilité/ })).not.toBeInTheDocument();
  });
});
