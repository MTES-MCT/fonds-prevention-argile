import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CarteExpert } from "./CarteExpert";

const expert = {
  id: "e-1",
  nom: "Géotech",
  siret: "39248872200027",
  dateValidationDhup: "2026-05-15",
  departements: [
    {
      code: "36",
      nom: "Indre",
      email: "indre@exemple.fr",
      telephone: "02 00 00 00 00",
      expertNom: null,
      expertEmail: null,
      expertTelephone: null,
    },
  ],
};

describe("CarteExpert", () => {
  it("affiche le SIRET et la date de validation DHUP", () => {
    render(<CarteExpert expert={expert} codeDepartement="36" />);
    expect(screen.getByRole("heading", { level: 3, name: "Géotech" })).toBeInTheDocument();
    expect(screen.getByText("SIRET 39248872200027 · validé par la DHUP le 15/05/2026")).toBeInTheDocument();
  });

  it("met l'email et le téléphone chacun sur sa ligne", () => {
    render(<CarteExpert expert={expert} codeDepartement="36" />);
    const email = screen.getByRole("link", { name: "indre@exemple.fr" });
    const telephone = screen.getByRole("link", { name: "02 00 00 00 00" });
    expect(email).toHaveAttribute("href", "mailto:indre@exemple.fr");
    expect(telephone).toHaveAttribute("href", "tel:0200000000");
    expect(email.closest("li")).not.toBe(telephone.closest("li"));
  });

  it("affiche le contact du département demandé, pas celui d'un autre", () => {
    const deuxDepartements = {
      ...expert,
      departements: [
        ...expert.departements,
        {
          code: "18",
          nom: "Cher",
          email: "cher@exemple.fr",
          telephone: null,
          expertNom: null,
          expertEmail: null,
          expertTelephone: null,
        },
      ],
    };
    render(<CarteExpert expert={deuxDepartements} codeDepartement="18" />);
    expect(screen.getByRole("link", { name: "cher@exemple.fr" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "indre@exemple.fr" })).not.toBeInTheDocument();
  });

  it("distingue l'expert qui se déplace du contact de réservation", () => {
    const avecExpertSurPlace = {
      ...expert,
      departements: [
        {
          ...expert.departements[0],
          expertNom: "Paul Martin",
          expertEmail: "paul@exemple.fr",
          expertTelephone: "06 11 22 33 44",
        },
      ],
    };
    render(<CarteExpert expert={avecExpertSurPlace} codeDepartement="36" />);
    expect(screen.getByText("Réservation")).toBeInTheDocument();
    expect(screen.getByText("Expert sur place : Paul Martin")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "paul@exemple.fr" })).toHaveAttribute("href", "mailto:paul@exemple.fr");
    expect(screen.getByRole("link", { name: "06 11 22 33 44" })).toHaveAttribute("href", "tel:0611223344");
  });

  it("annonce un expert sans contact pour le département", () => {
    render(<CarteExpert expert={{ ...expert, departements: [] }} codeDepartement="36" />);
    expect(screen.getByText("Contact non renseigné")).toBeInTheDocument();
  });

  it("passe le titre au niveau 4 en version compacte", () => {
    render(<CarteExpert expert={expert} codeDepartement="36" compacte />);
    expect(screen.getByRole("heading", { level: 4, name: "Géotech" })).toBeInTheDocument();
  });
});
