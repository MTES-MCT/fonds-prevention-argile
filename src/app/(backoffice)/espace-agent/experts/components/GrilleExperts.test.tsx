import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { GrilleExperts } from "./GrilleExperts";

const expert = (id: string, nom: string) => ({
  id,
  nom,
  siret: "39248872200027",
  dateValidationDhup: null,
  departements: [{ code: "36", nom: "Indre", email: `${id}@exemple.fr`, telephone: null }],
});

describe("GrilleExperts", () => {
  it("garde l'ordre reçu du serveur, une carte par expert, avec la mention de libre choix", () => {
    render(<GrilleExperts experts={[expert("a", "Alpha"), expert("b", "Bêta")]} codeDepartement="36" />);

    const titres = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titres).toEqual(["Alpha", "Bêta"]);
    expect(screen.getByText(/présentés sans ordre de préférence/)).toBeInTheDocument();

    const carte = screen.getAllByRole("listitem")[0];
    expect(within(carte).getByText("SIRET 39248872200027")).toBeInTheDocument();
    expect(within(carte).getByRole("link", { name: "a@exemple.fr" })).toHaveAttribute("href", "mailto:a@exemple.fr");
  });

  it("annonce un département sans expert", () => {
    render(<GrilleExperts experts={[]} codeDepartement="75" />);
    expect(screen.getByText("Aucun expert validé dans ce département pour l'instant.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});
