import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VulnerabiliteSection from "./VulnerabiliteSection";

const active = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: active,
}));

describe("VulnerabiliteSection", () => {
  beforeEach(() => {
    active.mockReturnValue(true);
  });

  it("s'affiche quand le simulateur de vulnérabilité est activé", () => {
    render(<VulnerabiliteSection />);

    expect(screen.getByRole("heading", { name: "Vous n'êtes pas sûr de remplir ces critères ?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Estimer la vulnérabilité de mon logement/ })).toHaveAttribute(
      "href",
      "/vulnerabilite-rga"
    );
  });

  it("ne rend rien quand il est désactivé, comme en production", () => {
    active.mockReturnValue(false);
    const { container } = render(<VulnerabiliteSection />);

    expect(container).toBeEmptyDOMElement();
  });
});
