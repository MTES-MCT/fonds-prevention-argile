import { describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import EmbedVulnerabiliteRgaPage from "./page";

vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: () => true,
}));

vi.mock("@/features/vulnerabilite-rga", () => ({
  VulnerabiliteFormulaire: ({ urlSimulateurEligibilite }: { urlSimulateurEligibilite?: string }) => (
    <a href={urlSimulateurEligibilite}>Vérifier mon éligibilité</a>
  ),
}));

async function renvoiVersEligibilite(partner?: string | string[]) {
  render(await EmbedVulnerabiliteRgaPage({ searchParams: Promise.resolve({ partner }) }));
  return screen.getByRole("link", { name: "Vérifier mon éligibilité" }).getAttribute("href");
}

describe("EmbedVulnerabiliteRgaPage : renvoi vers le simulateur d'éligibilité", () => {
  it("renvoie vers la version embarquée, la seule affichable dans l'iframe d'un partenaire", async () => {
    expect(await renvoiVersEligibilite()).toBe("/embed-simulateur");
  });

  it("transmet un partenaire connu", async () => {
    expect(await renvoiVersEligibilite(" MAIF ")).toBe("/embed-simulateur?partner=maif");
  });

  it("ne transmet ni un partenaire inconnu ni un paramètre répété", async () => {
    expect(await renvoiVersEligibilite("inconnu")).toBe("/embed-simulateur");
    cleanup();
    expect(await renvoiVersEligibilite(["maif", "maif"])).toBe("/embed-simulateur");
  });
});
