import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StepArbreProximite } from "./StepArbreProximite";

// Sous Vitest, un import de SVG est une chaîne : `next/image` y exige des dimensions.
vi.mock("next/image", () => ({ default: () => null }));

function rendre(props: Partial<Parameters<typeof StepArbreProximite>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <StepArbreProximite numeroEtape={7} totalEtapes={12} canGoBack onSubmit={onSubmit} onBack={() => {}} {...props} />
  );
  return { onSubmit, suivant: () => screen.getByRole("button", { name: "Suivant" }) };
}

describe("StepArbreProximite", () => {
  it("ne pose l'essence que si un arbre est signalé", async () => {
    rendre();
    expect(screen.queryByText("Quelle est l'essence de cet arbre ?")).toBeNull();

    await userEvent.click(screen.getByLabelText("Oui, un arbre est proche des fondations"));

    expect(screen.getByText("Quelle est l'essence de cet arbre ?")).toBeInTheDocument();
    expect(screen.getByText(/Chêne, peuplier, saule, frêne, cèdre/)).toBeInTheDocument();
  });

  it("attend l'essence avant de passer à la suite, puis envoie les deux réponses", async () => {
    const { onSubmit, suivant } = rendre();

    await userEvent.click(screen.getByLabelText("Oui, un arbre est proche des fondations"));
    expect(suivant()).toBeDisabled();

    await userEvent.click(screen.getByLabelText(/Arbre fruitier ou petit arbre/));
    expect(screen.getByText("Point de vigilance")).toBeInTheDocument();
    await userEvent.click(suivant());

    expect(onSubmit).toHaveBeenCalledWith({
      vegetation: { arbre_proximite: "oui", arbre_essence: "fruitier_petit" },
    });
  });

  it("efface l'essence quand l'arbre n'est plus signalé", async () => {
    const { onSubmit, suivant } = rendre({ initialValue: "oui", initialEssence: "tres_gourmand" });

    await userEvent.click(screen.getByLabelText("Non, aucun arbre proche"));
    await userEvent.click(suivant());

    expect(onSubmit).toHaveBeenCalledWith({ vegetation: { arbre_proximite: "non", arbre_essence: undefined } });
  });
});
