import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectMultiple, { type OptionSelect } from "./SelectMultiple";

const OPTIONS: OptionSelect[] = [
  { valeur: "18", libelle: "18 - Cher" },
  { valeur: "36", libelle: "36 - Indre" },
  { valeur: "63", libelle: "63 - Puy-de-Dôme" },
];

function Champ({ initiales = [], onChange = vi.fn() }: { initiales?: string[]; onChange?: (v: string[]) => void }) {
  const [valeurs, setValeurs] = useState(initiales);
  return (
    <SelectMultiple
      id="departements"
      label="Départements"
      options={OPTIONS}
      valeurs={valeurs}
      onChange={(nouvelles) => {
        setValeurs(nouvelles);
        onChange(nouvelles);
      }}
      placeholder="Rechercher"
      libelleInconnu={(valeur) => `Code ${valeur}`}
    />
  );
}

describe("SelectMultiple", () => {
  it("filtre sans tenir compte des accents ni de la casse, puis choisit au clic", async () => {
    const onChange = vi.fn();
    render(<Champ onChange={onChange} />);

    await userEvent.type(screen.getByRole("combobox", { name: "Départements" }), "DOME");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["63 - Puy-de-Dôme"]);

    await userEvent.click(screen.getByRole("option", { name: "63 - Puy-de-Dôme" }));
    expect(onChange).toHaveBeenLastCalledWith(["63"]);
    expect(screen.getByRole("option", { name: "63 - Puy-de-Dôme" })).toHaveAttribute("aria-selected", "true");
  });

  it("se pilote au clavier : flèches, Entrée pour choisir, Retour arrière pour retirer le dernier", async () => {
    const onChange = vi.fn();
    render(<Champ onChange={onChange} />);
    const champ = screen.getByRole("combobox", { name: "Départements" });

    await userEvent.type(champ, "{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(["36"]);

    await userEvent.type(champ, "{Backspace}");
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("retire une valeur par son étiquette, y compris une valeur absente des options", async () => {
    const onChange = vi.fn();
    render(<Champ initiales={["36", "99"]} onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Retirer Code 99" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retirer 36 - Indre" }));
    expect(onChange).toHaveBeenLastCalledWith(["99"]);
  });
});
