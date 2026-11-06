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
    expect(screen.getByText("SIRET 39248872200027 · validé par la DHUP le 15/05/2026")).toBeInTheDocument();
  });

  it("met l'email et le téléphone chacun sur sa ligne", () => {
    render(<ListeExperts experts={[expert]} codeDepartement="36" />);
    const email = screen.getByRole("link", { name: "indre@exemple.fr" });
    const telephone = screen.getByRole("link", { name: "02 00 00 00 00" });
    expect(email).toHaveAttribute("href", "mailto:indre@exemple.fr");
    expect(telephone).toHaveAttribute("href", "tel:0200000000");
    expect(email.closest("li")).not.toBe(telephone.closest("li"));
  });

  it("affiche le contact du département demandé, pas celui d'un autre", () => {
    const deuxDepartements = {
      ...expert,
      departements: [...expert.departements, { code: "18", nom: "Cher", email: "cher@exemple.fr", telephone: null }],
    };
    render(<ListeExperts experts={[deuxDepartements]} codeDepartement="18" />);
    expect(screen.getByRole("link", { name: "cher@exemple.fr" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "indre@exemple.fr" })).not.toBeInTheDocument();
  });

  it("annonce un expert sans contact pour le département", () => {
    render(<ListeExperts experts={[{ ...expert, departements: [] }]} codeDepartement="36" />);
    expect(screen.getByText("Contact non renseigné")).toBeInTheDocument();
  });

  it("annonce un département sans expert", () => {
    render(<ListeExperts experts={[]} codeDepartement="75" />);
    expect(screen.getByText("Aucun expert validé dans ce département pour l'instant.")).toBeInTheDocument();
    expect(screen.getByText(/présentés sans ordre de préférence/)).toBeInTheDocument();
  });
});
