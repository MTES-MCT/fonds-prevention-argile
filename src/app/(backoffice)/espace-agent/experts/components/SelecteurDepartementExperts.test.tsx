import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { SelecteurDepartementExperts } from "./SelecteurDepartementExperts";

const departements = [
  { code: "18", nom: "Cher", aDesExperts: false },
  { code: "36", nom: "Indre", aDesExperts: true },
  { code: "59", nom: "Nord", aDesExperts: true },
];

const PROPS = {
  valeurActuelle: "36",
  departementsConsultables: departements,
  departementsDuTerritoire: ["36"],
  libelleTous: "Tous les départements",
  territoireRegroupable: false,
};

describe("SelecteurDepartementExperts", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("charge le département dès qu'il est choisi, sans bouton", async () => {
    render(<SelecteurDepartementExperts {...PROPS} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Département"), "59");
    expect(replace).toHaveBeenCalledWith("/espace-agent/experts?departement=59", { scroll: false });
  });

  it("place le territoire de l'agent en tête, à part des autres départements", () => {
    render(<SelecteurDepartementExperts {...PROPS} />);

    const territoire = screen.getByRole("group", { name: "Votre territoire" });
    expect(
      within(territoire)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["36 - Indre"]);
    const autres = screen.getByRole("group", { name: "Autres départements" });
    expect(
      within(autres)
        .getAllByRole("option")
        .map((o) => o.textContent)
    ).toEqual(["18 - Cher (aucun expert)", "59 - Nord"]);
  });

  it("propose en tête tous les départements, et le territoire regroupé d'un agent qui en couvre plusieurs", async () => {
    render(
      <SelecteurDepartementExperts
        {...PROPS}
        valeurActuelle="territoire"
        departementsDuTerritoire={["36", "59"]}
        territoireRegroupable
      />
    );

    const options = screen.getAllByRole("option").map((o) => o.textContent);
    expect(options.slice(0, 2)).toEqual(["Tous les départements", "Votre territoire (2 départements)"]);
    expect(screen.getByLabelText("Département")).toHaveValue("territoire");

    await userEvent.selectOptions(screen.getByLabelText("Département"), "tous");
    expect(replace).toHaveBeenCalledWith("/espace-agent/experts?departement=tous", { scroll: false });
  });

  it("ne fait ni groupes ni « tous » quand l'agent n'a qu'un département", () => {
    render(
      <SelecteurDepartementExperts
        {...PROPS}
        departementsConsultables={[{ code: "36", nom: "Indre", aDesExperts: true }]}
      />
    );

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["36 - Indre"]);
  });
});
