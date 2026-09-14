import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimulationRecap } from "./SimulationRecap";
import type { PartialRGASimulationData } from "@/shared/domain/types/rga-simulation.types";

const eligible = {
  logement: {
    adresse: "97 rue de Notz, 36000 Châteauroux",
    type: "maison",
    niveaux: 2,
    mitoyen: false,
    proprietaire_occupant: true,
    zone_dexposition: "fort",
    annee_de_construction: "2008",
    code_departement: "36",
    code_region: "24",
    commune: "36044",
  },
  rga: { sinistres: "saine", assure: true, indemnise_indemnise_rga: false, demande_catnat_en_cours: false },
  menage: { personnes: 4, revenu_rga: 30000 },
  simulatedAt: "2026-07-07T10:00:00.000Z",
} as PartialRGASimulationData;

describe("SimulationRecap", () => {
  it("affiche l'adresse et les critères de la simulation", () => {
    render(<SimulationRecap simulation={eligible} />);

    expect(screen.getByText(/97 rue de Notz, 36000 Châteauroux/)).toBeInTheDocument();
    expect(screen.getByText("2 NIVEAUX")).toBeInTheDocument();
    expect(screen.getByText("MAISON")).toBeInTheDocument();
  });

  it("date l'en-tête à partir de la simulation, pas du jour", () => {
    render(<SimulationRecap simulation={eligible} titre="Version active" />);

    expect(screen.getByRole("heading", { name: /Version active - 07\/07\/26/ })).toBeInTheDocument();
  });

  it("signale les champs modifiés, et en rouge celui qui bloque", () => {
    const nonEligible = {
      ...eligible,
      logement: { ...eligible.logement, niveaux: 4, annee_de_construction: "2009" },
    } as PartialRGASimulationData;

    render(
      <SimulationRecap simulation={nonEligible} highlights={{ anneeConstruction: "diff", nombreNiveaux: "bloquant" }} />
    );

    expect(screen.getByText("2009").className).toContain("fr-badge--info");
    expect(screen.getByText("4 NIVEAUX").className).toContain("fr-badge--error");
    // Champ non signalé : badge neutre, sans couleur d'alerte.
    expect(screen.getByText("MAISON").className).not.toContain("fr-badge--info");
  });

  it("rend le verdict d'éligibilité de la simulation affichée", () => {
    const nonEligible = {
      ...eligible,
      logement: { ...eligible.logement, niveaux: 4 },
    } as PartialRGASimulationData;

    render(<SimulationRecap simulation={nonEligible} />);

    expect(screen.getByText("Non éligible")).toBeInTheDocument();
    expect(screen.queryByText("Éligible")).not.toBeInTheDocument();
  });

  it("ne rend aucun critère sans simulation", () => {
    render(<SimulationRecap simulation={null} />);

    expect(screen.queryByText("MAISON")).not.toBeInTheDocument();
  });

  it("marque la version sélectionnée comme un bouton primaire DSFR", () => {
    const { container } = render(<SimulationRecap simulation={eligible} titre="Dernière version" selectionne />);

    const carte = container.firstElementChild as HTMLElement;

    // Jetons du bouton primaire : un filet de 1 px ne se voyait pas, et rien ne disait
    // laquelle des deux colonnes serait conservée (retour de recette, septembre 2026).
    expect(carte.style.background).toContain("--background-action-high-blue-france");
    expect(carte.style.color).toContain("--text-inverted-blue-france");
    expect(container.querySelector(".fr-icon-check-line")).toBeTruthy();
    expect(screen.getByText("Version qui sera conservée")).toBeInTheDocument();
  });

  it("laisse la version non sélectionnée sur le fond par défaut", () => {
    const { container } = render(<SimulationRecap simulation={eligible} titre="Version active" />);

    const carte = container.firstElementChild as HTMLElement;

    expect(carte.style.background).toContain("--background-default-grey");
    expect(carte.style.color).toBe("");
    expect(screen.queryByText("Version qui sera conservée")).not.toBeInTheDocument();
  });
});
