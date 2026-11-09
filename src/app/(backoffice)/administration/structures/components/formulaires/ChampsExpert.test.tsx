import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChampsExpert, { expertDepuis } from "./ChampsExpert";

describe("ChampsExpert", () => {
  it("ne propose que les départements du dispositif, sans masquer un département déjà enregistré ailleurs", () => {
    const valeur = {
      ...expertDepuis(null),
      departements: [{ code: "18", email: "", telephone: "" }],
    };
    render(<ChampsExpert idPrefix="expert" valeur={valeur} onChange={vi.fn()} />);

    const liste = screen.getByLabelText("Département") as HTMLSelectElement;
    expect(liste).toHaveValue("18");
    const options = [...liste.options].map((option) => option.textContent);
    expect(options.slice(0, 3)).toEqual(["Sélectionner", "18 - Cher (hors dispositif)", "03 - Allier"]);
    expect(options).toHaveLength(13);
  });
});
