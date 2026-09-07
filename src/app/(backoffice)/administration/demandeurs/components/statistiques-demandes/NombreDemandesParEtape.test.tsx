import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NombreDemandesParEtape } from "./NombreDemandesParEtape";
import { Step } from "@/shared/domain/value-objects/step.enum";
import type { UserWithParcoursDetails } from "@/features/backoffice";

const users = (...steps: Step[]): UserWithParcoursDetails[] =>
  steps.map((currentStep, i) => ({
    user: { id: `u-${i}` },
    parcours: { id: `p-${i}`, currentStep },
  })) as unknown as UserWithParcoursDetails[];

describe("NombreDemandesParEtape", () => {
  it("compte l'étape invitation, qu'aucune des 5 étapes numérotées ne couvre", () => {
    render(<NombreDemandesParEtape users={users(Step.INVITATION, Step.INVITATION, Step.DEVIS)} />);

    expect(screen.getByRole("heading", { name: /Nombre de demandes par étape \(3\)/ })).toBeInTheDocument();
    expect(screen.getByText("Invitation")).toBeInTheDocument();
  });

  it("affiche un total égal au nombre de demandes, quelle que soit l'étape", () => {
    const tous = users(Step.INVITATION, Step.CHOIX_AMO, Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES);
    render(<NombreDemandesParEtape users={tous} />);

    expect(screen.getByRole("heading", { name: /\(6\)/ })).toBeInTheDocument();
  });

  it("accepte un titre et une infobulle personnalisés (graphe des archivés)", () => {
    render(
      <NombreDemandesParEtape
        users={users(Step.DEVIS)}
        titre="Nombre de demandes archivées par étape"
        tooltip="Archivés uniquement"
      />
    );

    expect(screen.getByRole("heading", { name: /Nombre de demandes archivées par étape \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Archivés uniquement");
  });
});
