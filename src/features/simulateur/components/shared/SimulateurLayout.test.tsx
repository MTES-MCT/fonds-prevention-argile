import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimulateurLayout } from "./SimulateurLayout";
import { SimulateurProvider } from "./SimulateurContext";
import { NavigationButtons } from "./NavigationButtons";

function Etape({ onPrevious = () => {} }: { onPrevious?: () => void }) {
  return (
    <SimulateurLayout title="Quelle est l'adresse du logement ?" currentStep={2} totalSteps={9}>
      <NavigationButtons
        canGoBack
        onPrevious={onPrevious}
        onNext={() => {}}
        isNextDisabled
        aideDesactive="Touchez votre logement"
      />
    </SimulateurLayout>
  );
}

describe("SimulateurLayout", () => {
  it("garde « Précédent » à côté de « Suivant », en bas", () => {
    const onPrevious = vi.fn();
    render(<Etape onPrevious={onPrevious} />);

    fireEvent.click(screen.getByRole("button", { name: "Précédent" }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Suivant" })).toBeInTheDocument();
  });

  it("affiche le compteur et la question en titre de page", () => {
    render(<Etape />);

    expect(screen.getByText("Simulation d'éligibilité - 2/9")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Quelle est l'adresse du logement ?" })).toBeInTheDocument();
  });

  it("n'affiche plus le titre générique du simulateur", () => {
    render(<Etape />);

    expect(screen.queryByText(/Simulateur d.éligibilité au Fonds Prévention Argile/)).not.toBeInTheDocument();
  });

  it("explique pourquoi « Suivant » est désactivé", () => {
    render(<Etape />);

    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
    expect(screen.getByText("Touchez votre logement")).toBeInTheDocument();
  });

  it("rétrograde la question en h2 sous le titre d'un écran d'édition", () => {
    render(
      <SimulateurProvider formTitle="Mes données de simulation">
        <Etape />
      </SimulateurProvider>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Quelle est l'adresse du logement ?" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("laisse le wizard parent gérer l'en-tête en mode embarqué", () => {
    render(
      <SimulateurProvider embedded>
        <Etape />
      </SimulateurProvider>
    );

    expect(screen.getByRole("button", { name: "Précédent" })).toBeInTheDocument();
    expect(screen.queryByText("Simulation d'éligibilité - 2/9")).not.toBeInTheDocument();
    expect(screen.queryByText("Touchez votre logement")).not.toBeInTheDocument();
  });
});
