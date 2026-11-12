import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChampsExpert, { expertDepuis } from "./ChampsExpert";

describe("ChampsExpert", () => {
  it("ne propose que les départements du dispositif, sans masquer un département déjà enregistré ailleurs", () => {
    const valeur = {
      ...expertDepuis(null),
      departements: [{ ...expertDepuis(null).departements[0], code: "18" }],
    };
    render(<ChampsExpert idPrefix="expert" valeur={valeur} onChange={vi.fn()} />);

    const liste = screen.getByLabelText("Département") as HTMLSelectElement;
    expect(liste).toHaveValue("18");
    const options = [...liste.options].map((option) => option.textContent);
    expect(options.slice(0, 3)).toEqual(["Sélectionner", "18 - Cher (hors dispositif)", "03 - Allier"]);
    expect(options).toHaveLength(13);
  });

  it("reprend les forfaits enregistrés à la française", () => {
    const enregistre = expertDepuis({
      id: "e-1",
      nom: "Géotech",
      siret: "39248872200027",
      dateValidationDhup: null,
      contactInterne: { nom: null, email: null, telephone: null },
      desactivation: null,
      departements: [
        {
          code: "36",
          nom: "Indre",
          email: null,
          telephone: null,
          expertNom: null,
          expertEmail: null,
          expertTelephone: null,
          forfaitDiagnosticHt: 1200.5,
          forfaitReseauHt: 450,
        },
      ],
    });
    render(<ChampsExpert idPrefix="expert" valeur={enregistre} onChange={vi.fn()} />);

    expect(screen.getByLabelText("Forfait diagnostic")).toHaveValue("1200,50");
    expect(screen.getByLabelText("Forfait réseaux")).toHaveValue("450");
  });
});
