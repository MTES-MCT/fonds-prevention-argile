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

    await userEvent.click(
      screen.getByLabelText("Oui, un arbre est proche des fondations (moins de 1,5 fois sa hauteur adulte)")
    );

    expect(screen.getByText("Quelle est l'essence de cet arbre ?")).toBeInTheDocument();
    expect(screen.getByText(/Chêne, peuplier, saule, cèdre, frêne/)).toBeInTheDocument();
  });

  it("attend l'essence avant de passer à la suite, puis envoie les deux réponses", async () => {
    const { onSubmit, suivant } = rendre();

    await userEvent.click(
      screen.getByLabelText("Oui, un arbre est proche des fondations (moins de 1,5 fois sa hauteur adulte)")
    );
    expect(suivant()).toBeDisabled();

    await userEvent.click(screen.getByLabelText(/Arbre peu agressif/));
    expect(screen.getByText("À surveiller")).toBeInTheDocument();
    await userEvent.click(suivant());

    expect(onSubmit).toHaveBeenCalledWith({
      vegetation: { arbre_proximite: "oui", arbre_essence: "peu_agressif" },
    });
  });

  it("efface l'essence quand l'arbre n'est plus signalé", async () => {
    const { onSubmit, suivant } = rendre({ initialValue: "oui", initialEssence: "tres_agressif" });

    await userEvent.click(screen.getByLabelText("Non, aucun arbre proche"));
    await userEvent.click(suivant());

    expect(onSubmit).toHaveBeenCalledWith({ vegetation: { arbre_proximite: "non", arbre_essence: undefined } });
  });
});
