import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SimulationsParDepartementTable from "./SimulationsParDepartementTable";
import type { DepartementStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

function stats(code: string, nom: string, simulations: number, eligibles: number): DepartementStats {
  return {
    codeDepartement: code,
    nomDepartement: nom,
    simulations,
    simulationsEligibles: eligibles,
    pourcentageEligibles: 0,
    comptesCrees: 1,
    dossiersDN: 0,
    transformationGlobale: 0,
  };
}

const DEPARTEMENTS = [
  stats("75", "Paris", 12, 0),
  stats("03", "Allier", 40, 30),
  stats("13", "Bouches-du-Rhône", 8, 0),
];

function lignesAffichees() {
  const [, corps] = screen.getAllByRole("rowgroup");
  return within(corps)
    .getAllByRole("row")
    .map((r) => within(r).getAllByRole("cell")[0].textContent);
}

describe("SimulationsParDepartementTable", () => {
  afterEach(() => vi.restoreAllMocks());

  it("affiche tous les départements, triés par simulations, avec leur total", () => {
    render(
      <SimulationsParDepartementTable
        departements={DEPARTEMENTS}
        nonRenseigne={null}
        loading={false}
        periodeId="tout"
      />
    );

    expect(lignesAffichees()).toEqual(["03 AllierPilote", "75 Paris", "13 Bouches-du-Rhône"]);
    expect(screen.getByRole("rowheader", { name: "Total (3 départements)" })).toBeInTheDocument();
    expect(screen.getByText("30 (50 %)")).toBeInTheDocument();
  });

  it("restreint la liste aux départements hors expérimentation", async () => {
    render(
      <SimulationsParDepartementTable
        departements={DEPARTEMENTS}
        nonRenseigne={null}
        loading={false}
        periodeId="tout"
      />
    );

    await userEvent.selectOptions(screen.getByLabelText("Départements affichés"), "hors-pilotes");

    expect(lignesAffichees()).toEqual(["75 Paris", "13 Bouches-du-Rhône"]);
    expect(screen.getByRole("rowheader", { name: "Total (2 départements)" })).toBeInTheDocument();
  });

  it("exporte en CSV les lignes affichées", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:csv");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(
      <SimulationsParDepartementTable departements={DEPARTEMENTS} nonRenseigne={null} loading={false} periodeId="30j" />
    );

    await userEvent.selectOptions(screen.getByLabelText("Départements affichés"), "pilotes");
    await userEvent.click(screen.getByRole("button", { name: "Exporter en CSV" }));

    expect(click).toHaveBeenCalledTimes(1);
    const csv = await (createObjectURL.mock.calls[0][0] as Blob).text();
    expect(csv).toContain("03;Allier;Oui;40;30;10;75;1;0");
    expect(csv).not.toContain("Paris");
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(
      /^simulations-par-departement_30j_pilotes_\d{4}-\d{2}-\d{2}\.csv$/
    );
  });

  it("désactive l'export quand il n'y a aucune donnée", () => {
    render(<SimulationsParDepartementTable departements={[]} nonRenseigne={null} loading={false} periodeId="tout" />);

    expect(screen.getByText("Aucune donnée disponible.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter en CSV" })).toBeDisabled();
  });

  it("ajoute les simulations sans département sur « Tous », pour retomber sur le total de l'entonnoir", async () => {
    render(
      <SimulationsParDepartementTable
        departements={DEPARTEMENTS}
        nonRenseigne={{ simulations: 40, simulationsEligibles: 10 }}
        loading={false}
        periodeId="tout"
      />
    );

    expect(lignesAffichees().at(-1)).toBe("Département non renseigné");
    expect(screen.getByRole("rowheader", { name: "Total (3 départements et non renseigné)" })).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText("Départements affichés"), "pilotes");

    expect(lignesAffichees()).toEqual(["03 AllierPilote"]);
    expect(screen.getByText(/Les 40 simulations sans département/)).toBeInTheDocument();
  });
});
