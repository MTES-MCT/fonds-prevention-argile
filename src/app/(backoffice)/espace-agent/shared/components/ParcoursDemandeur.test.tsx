import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParcoursDemandeur } from "./ParcoursDemandeur";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";

function etape(libelle: string): HTMLElement {
  const li = screen.getByText(new RegExp(libelle)).closest("li");
  if (!li) throw new Error(`Étape « ${libelle} » introuvable`);
  return li;
}

function renderParcours(numerosDn?: Partial<Record<Step, string>>) {
  return render(
    <ParcoursDemandeur
      currentStep={Step.DIAGNOSTIC}
      currentStatus={Status.TODO}
      dsStatus={null}
      dates={{ compteCreatedAt: new Date("2026-09-01") }}
      numerosDn={numerosDn}
    />
  );
}

describe("ParcoursDemandeur — numéro de dossier DN", () => {
  it("affiche le numéro sous l'étape à laquelle il appartient", () => {
    renderParcours({ [Step.ELIGIBILITE]: "123456", [Step.DIAGNOSTIC]: "234567" });

    expect(etape("formulaire d'éligibilité")).toHaveTextContent("Dossier Démarches Numériques n° 123456");
    expect(etape("Soumettre le diagnostic")).toHaveTextContent("Dossier Démarches Numériques n° 234567");
    expect(etape("Soumettre les devis")).not.toHaveTextContent("Démarches Numériques");
  });

  it("n'affiche aucun numéro sans dossier DN", () => {
    renderParcours();

    expect(screen.queryByText(/Dossier Démarches Numériques/)).not.toBeInTheDocument();
  });
});
