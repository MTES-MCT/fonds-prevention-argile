import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import QuestCeQueLeRgaSection from "./QuestCeQueLeRgaSection";

const active = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: active,
}));

describe("QuestCeQueLeRgaSection : lien vers la page de sensibilisation", () => {
  beforeEach(() => {
    active.mockReturnValue(true);
  });

  it("mène à la page « Comprendre le RGA » quand le simulateur de vulnérabilité est activé", () => {
    render(<QuestCeQueLeRgaSection />);

    expect(screen.getByRole("link", { name: /Comprendre le RGA en 3 temps/ })).toHaveAttribute(
      "href",
      "/comprendre-le-rga"
    );
  });

  it("ne pose aucun lien vers une page en 404 quand il est désactivé, comme en production", () => {
    active.mockReturnValue(false);
    render(<QuestCeQueLeRgaSection />);

    expect(screen.queryByRole("link", { name: /Comprendre le RGA/ })).not.toBeInTheDocument();
  });
});
