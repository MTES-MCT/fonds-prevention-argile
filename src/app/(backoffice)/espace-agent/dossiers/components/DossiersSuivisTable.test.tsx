import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DossiersSuivisTable } from "./DossiersSuivisTable";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";

function makeDossier(): DossierItem {
  return {
    parcoursId: "p1",
    particulier: { prenom: "Jean", nom: "Dupont", email: "jean@dupont.fr", telephone: null },
    logement: { commune: "Issoudun", codeDepartement: "36", codeEpci: null },
    currentStep: Step.ELIGIBILITE,
    currentStatus: Status.EN_INSTRUCTION,
    situationParticulier: SituationParticulier.PROSPECT,
    validation: null,
    dsStatus: null,
    instructedAt: null,
    createdByAgentId: null,
    archivedAt: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-20"),
    responsable: { type: "INDETERMINE" },
    etat: "DDT",
    canActAsResponsable: false,
    derniereAction: null,
  };
}

describe("DossiersSuivisTable", () => {
  it("affiche l'astuce de défilement horizontal (Maj + molette)", () => {
    render(<DossiersSuivisTable dossiers={[]} />);
    expect(screen.getByText(/Maj \+ molette/i)).toBeInTheDocument();
  });

  it("fige la colonne Demandeurs (en-tête et cellule)", () => {
    render(<DossiersSuivisTable dossiers={[makeDossier()]} />);

    const header = screen.getByRole("columnheader", { name: "Demandeurs" });
    expect(header).toHaveClass("dossiers-table__sticky-col");

    const cell = screen.getByRole("link", { name: "Jean Dupont" }).closest("td");
    expect(cell).toHaveClass("dossiers-table__sticky-col");
  });
});
