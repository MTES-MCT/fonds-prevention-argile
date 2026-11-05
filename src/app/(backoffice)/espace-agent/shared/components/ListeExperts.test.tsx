import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListeExperts } from "./ListeExperts";

const expert = {
  id: "e-1",
  nom: "Géotech",
  siret: "39248872200027",
  dateValidationDhup: "2026-05-15",
  departements: [{ code: "36", nom: "Indre", email: "indre@exemple.fr", telephone: "02 00 00 00 00" }],
};

describe("ListeExperts", () => {
  it("accompagne toujours la liste de la mention de libre choix", () => {
    render(<ListeExperts experts={[expert]} codeDepartement="36" />);
    expect(screen.getByText(/présentés sans ordre de préférence/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "indre@exemple.fr" })).toHaveAttribute("href", "mailto:indre@exemple.fr");
    expect(screen.getByRole("link", { name: "02 00 00 00 00" })).toHaveAttribute("href", "tel:0200000000");
  });

  it("annonce un département sans expert", () => {
    render(<ListeExperts experts={[]} codeDepartement="75" />);
    expect(screen.getByText("Aucun expert validé dans ce département pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText(/présentés sans ordre de préférence/)).toBeInTheDocument();
  });
});
