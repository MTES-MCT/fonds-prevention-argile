import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { SelecteurDepartementExperts } from "./SelecteurDepartementExperts";

const departements = [
  { code: "18", nom: "Cher" },
  { code: "36", nom: "Indre" },
  { code: "59", nom: "Nord" },
];

describe("SelecteurDepartementExperts", () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it("charge le département dès qu'il est choisi, sans bouton", async () => {
    render(
      <SelecteurDepartementExperts
        departementActuel="36"
        departementsConsultables={departements}
        departementsDuTerritoire={["36"]}
      />
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Département"), "59");
    expect(replace).toHaveBeenCalledWith("/espace-agent/experts?departement=59", { scroll: false });
  });

  it("place le territoire de l'agent en tête, à part des autres départements", () => {
    render(
      <SelecteurDepartementExperts
        departementActuel="36"
        departementsConsultables={departements}
        departementsDuTerritoire={["36"]}
      />
    );

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
    ).toEqual(["18 - Cher", "59 - Nord"]);
  });

  it("ne fait pas de groupes quand l'agent ne sort pas de son territoire", () => {
    render(
      <SelecteurDepartementExperts
        departementActuel="36"
        departementsConsultables={[{ code: "36", nom: "Indre" }]}
        departementsDuTerritoire={["36"]}
      />
    );

    expect(screen.queryByRole("group")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "36 - Indre" })).toBeInTheDocument();
  });
});
