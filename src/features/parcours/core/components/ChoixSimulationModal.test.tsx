import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChoixSimulationModal } from "./ChoixSimulationModal";
import { comparerSimulations } from "@/features/simulateur/domain/services/comparaison-simulations.service";
import type { PartialRGASimulationData, RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

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
} as RGASimulationData;

function avec(logement: Record<string, unknown>) {
  return { ...eligible, logement: { ...eligible.logement, ...logement } } as PartialRGASimulationData;
}

function rendre(candidate: PartialRGASimulationData, handlers: Partial<{ onConfirmer: () => void }> = {}) {
  const onConfirmer = handlers.onConfirmer ?? vi.fn();
  render(
    <ChoixSimulationModal
      isOpen
      active={eligible}
      candidate={candidate}
      comparaison={comparerSimulations(eligible, candidate)}
      onConfirmer={onConfirmer}
      onFermer={vi.fn()}
    />
  );
  return { onConfirmer };
}

describe("ChoixSimulationModal", () => {
  it("présente les deux versions côte à côte", () => {
    rendre(avec({ annee_de_construction: "2009" }));

    expect(screen.getByText(/Version active - 07\/07\/26/)).toBeInTheDocument();
    expect(screen.getByText(/Dernière version - 07\/07\/26/)).toBeInTheDocument();
  });

  it("reste en alerte simple quand l'éligibilité ne bouge pas", () => {
    const { container } = render(
      <ChoixSimulationModal
        isOpen
        active={eligible}
        candidate={avec({ annee_de_construction: "2009", niveaux: 1 })}
        comparaison={comparerSimulations(eligible, avec({ annee_de_construction: "2009", niveaux: 1 }))}
        onConfirmer={vi.fn()}
        onFermer={vi.fn()}
      />
    );

    expect(container.querySelector(".fr-alert--info")).toBeTruthy();
    expect(container.querySelector(".fr-alert--warning")).toBeNull();
    expect(screen.queryByText(/modifient votre éligibilité/)).not.toBeInTheDocument();
  });

  it("avertit quand les différences changent l'éligibilité", () => {
    const candidate = avec({ niveaux: 4 });
    const { container } = render(
      <ChoixSimulationModal
        isOpen
        active={eligible}
        candidate={candidate}
        comparaison={comparerSimulations(eligible, candidate)}
        onConfirmer={vi.fn()}
        onFermer={vi.fn()}
      />
    );

    expect(container.querySelector(".fr-alert--warning")).toBeTruthy();
    expect(screen.getByText(/modifient votre éligibilité/)).toBeInTheDocument();
    expect(screen.getByText("4 NIVEAUX").className).toContain("fr-badge--error");
  });

  it("propose la dernière version par défaut, sans imposer le choix", () => {
    const { onConfirmer } = rendre(avec({ annee_de_construction: "2009" }));

    fireEvent.click(screen.getByText("Confirmer mon choix"));

    expect(onConfirmer).toHaveBeenCalledWith("candidate");
  });

  it("laisse conserver la version active du compte", () => {
    const { onConfirmer } = rendre(avec({ annee_de_construction: "2009" }));

    // Le <dialog> DSFR n'est pas ouvert par jsdom : ses noeuds sont inaccessibles
    // aux requêtes par rôle ou par libellé, d'où la sélection directe du radio.
    fireEvent.click(document.querySelector<HTMLInputElement>('input[value="active"]')!);
    fireEvent.click(screen.getByText("Confirmer mon choix"));

    expect(onConfirmer).toHaveBeenCalledWith("active");
  });
});
