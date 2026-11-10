import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ExpertsParDepartement, GrilleExperts } from "./GrilleExperts";

const expert = (id: string, nom: string) => ({
  id,
  nom,
  siret: "39248872200027",
  dateValidationDhup: null,
  departements: [
    {
      code: "36",
      nom: "Indre",
      email: `${id}@exemple.fr`,
      telephone: null,
      expertNom: null,
      expertEmail: null,
      expertTelephone: null,
    },
  ],
});

describe("GrilleExperts", () => {
  it("garde l'ordre reçu du serveur, une carte par expert, avec la mention de libre choix", () => {
    render(<GrilleExperts experts={[expert("a", "Alpha"), expert("b", "Bêta")]} codeDepartement="36" />);

    const titres = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titres).toEqual(["Alpha", "Bêta"]);
    expect(screen.getByText(/présentés sans ordre de préférence/)).toBeInTheDocument();

    const carte = screen.getAllByRole("listitem")[0];
    expect(within(carte).queryByText(/39248872200027/)).not.toBeInTheDocument();
    expect(within(carte).getByRole("link", { name: "a@exemple.fr" })).toHaveAttribute("href", "mailto:a@exemple.fr");
  });

  it("annonce un département sans expert", () => {
    render(<GrilleExperts experts={[]} codeDepartement="75" />);
    expect(screen.getByText("Aucun expert validé dans ce département pour l'instant.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });

  it("regroupe plusieurs départements, chacun sous son titre, avec une seule mention de libre choix", () => {
    render(
      <ExpertsParDepartement
        sections={[
          { code: "36", nom: "Indre", experts: [expert("a", "Alpha")] },
          { code: "18", nom: "Cher", experts: [] },
        ]}
      />
    );

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Indre (36)", "Cher (18)"]);
    expect(screen.getByRole("heading", { level: 4, name: "Alpha" })).toBeInTheDocument();
    expect(screen.getByText("1 expert")).toBeInTheDocument();
    expect(screen.getByText("Aucun expert validé dans ce département pour l'instant.")).toBeInTheDocument();
    expect(screen.getAllByText(/présentés sans ordre de préférence/)).toHaveLength(1);
  });
});
