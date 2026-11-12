import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpertsDuDepartement } from "./ExpertsDuDepartement";

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
      forfaitDiagnosticHt: null,
      forfaitReseauHt: null,
    },
  ],
});

describe("ExpertsDuDepartement", () => {
  it("met une carte par expert dans la carte du département, dans l'ordre reçu, avec la mention de libre choix", () => {
    render(
      <ExpertsDuDepartement
        departement={{ code: "36", nom: "Indre", experts: [expert("a", "Alpha"), expert("b", "Bêta")] }}
      />
    );

    expect(screen.getByRole("heading", { level: 3, name: "Experts du département" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 4 }).map((h) => h.textContent)).toEqual(["Alpha", "Bêta"]);
    expect(screen.getByText(/présentés sans ordre de préférence/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir l'annuaire des experts" })).toHaveAttribute(
      "href",
      "/espace-agent/experts?departement=36"
    );
  });

  it("annonce un département sans expert, avec la mention", () => {
    render(<ExpertsDuDepartement departement={{ code: "75", nom: "Paris", experts: [] }} />);

    expect(screen.getByText("Aucun expert validé dans ce département pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText(/présentés sans ordre de préférence/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 4 })).not.toBeInTheDocument();
  });
});
