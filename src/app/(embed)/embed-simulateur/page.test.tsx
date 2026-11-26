import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import EmbedSimulateurPage from "./page";

const vulnerabiliteActive = vi.hoisted(() => vi.fn(() => true));

vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: vulnerabiliteActive,
}));

vi.mock("@/features/simulateur/components/shared/SimulateurContext", () => ({
  SimulateurProvider: ({ urlVulnerabilite, children }: { urlVulnerabilite?: string | null; children: ReactNode }) => (
    <div data-testid="renvoi" data-url={urlVulnerabilite ?? "aucun"}>
      {children}
    </div>
  ),
}));

vi.mock("@/features/simulateur", () => ({
  SimulateurFormulaire: ({ partner }: { partner?: string | null }) => (
    <div data-testid="formulaire" data-partner={partner ?? "aucun"} />
  ),
}));

type Params = { partner?: string | string[]; vulnerabilite?: string | string[] };

async function rendre(params: Params = {}) {
  cleanup();
  render(await EmbedSimulateurPage({ searchParams: Promise.resolve(params) }));
  return {
    renvoi: screen.getByTestId("renvoi").getAttribute("data-url"),
    partenaire: screen.getByTestId("formulaire").getAttribute("data-partner"),
  };
}

describe("EmbedSimulateurPage : renvoi vers le simulateur de vulnérabilité", () => {
  beforeEach(() => {
    vulnerabiliteActive.mockReturnValue(true);
  });

  it("renvoie vers la version embarquée, la seule affichable dans l'iframe d'un partenaire", async () => {
    expect((await rendre()).renvoi).toBe("/embed-vulnerabilite-rga");
  });

  it("transmet un partenaire connu", async () => {
    expect((await rendre({ partner: " MAIF " })).renvoi).toBe("/embed-vulnerabilite-rga?partner=maif");
  });

  it("ne transmet ni un partenaire inconnu ni un paramètre répété", async () => {
    expect((await rendre({ partner: "inconnu" })).renvoi).toBe("/embed-vulnerabilite-rga");
    expect(await rendre({ partner: ["maif", "maif"] })).toEqual({
      renvoi: "/embed-vulnerabilite-rga",
      partenaire: "aucun",
    });
  });

  it("ne propose rien quand l'intégrateur passe ?vulnerabilite=0", async () => {
    expect((await rendre({ vulnerabilite: "0" })).renvoi).toBe("aucun");
    expect((await rendre({ vulnerabilite: "1" })).renvoi).toBe("/embed-vulnerabilite-rga");
  });

  it("ne propose rien tant que le simulateur de vulnérabilité est inactif", async () => {
    vulnerabiliteActive.mockReturnValue(false);

    expect((await rendre()).renvoi).toBe("aucun");
  });
});
