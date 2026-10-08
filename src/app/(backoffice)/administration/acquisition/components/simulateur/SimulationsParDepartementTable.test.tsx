import type { ComponentProps } from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SimulationsParDepartementTable from "./SimulationsParDepartementTable";
import type { TotalEntonnoir } from "@/features/backoffice/administration/acquisition/domain/simulations-departement";
import { DEPARTEMENTS_ELIGIBLES_RGA } from "@/shared/constants/rga.constants";
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

// Volontairement différent de la somme des lignes (60, 30) : l'entonnoir ne compte pas deux fois une visite.
const ENTONNOIR: TotalEntonnoir = { simulations: 55, eligibles: 28, nonEligibles: 27, pourcentageEligibles: 51 };

function tableau(props: Partial<ComponentProps<typeof SimulationsParDepartementTable>> = {}) {
  return render(
    <SimulationsParDepartementTable
      departements={DEPARTEMENTS}
      loading={false}
      periodeId="tout"
      totalEntonnoir={ENTONNOIR}
      totalEntonnoirChargement={false}
      {...props}
    />
  );
}

function lignesAffichees() {
  const [, corps] = screen.getAllByRole("rowgroup");
  return within(corps)
    .getAllByRole("row")
    .map((r) => within(r).getAllByRole("cell")[0].textContent);
}

const ligneDuPied = (nom: string) => screen.getByRole("rowheader", { name: nom }).closest("tr") as HTMLElement;

describe("SimulationsParDepartementTable", () => {
  afterEach(() => vi.restoreAllMocks());

  it("affiche tous les départements triés, avec la somme des lignes puis le total de l'entonnoir", () => {
    tableau();

    expect(lignesAffichees()).toEqual(["03 AllierPilote", "75 Paris", "13 Bouches-du-Rhône"]);

    const somme = within(ligneDuPied("Somme des lignes (3 départements)")).getAllByRole("cell");
    expect(somme.slice(0, 3).map((c) => c.textContent)).toEqual(["60", "30 (50 %)", "30"]);

    const total = within(ligneDuPied("Total, même mesure que l'entonnoir")).getAllByRole("cell");
    expect(total.map((c) => c.textContent)).toEqual(["55", "28 (51 %)", "27", "3", "0"]);
  });

  it("n'affiche que le cumul des lignes pour un sous-ensemble de départements", async () => {
    tableau();

    await userEvent.selectOptions(screen.getByLabelText("Départements affichés"), "hors-pilotes");

    expect(lignesAffichees()).toEqual(["75 Paris", "13 Bouches-du-Rhône"]);
    const cumul = within(ligneDuPied("Cumul des lignes affichées (2 départements)")).getAllByRole("cell");
    expect(cumul.slice(0, 3).map((c) => c.textContent)).toEqual(["20", "0 (0 %)", "20"]);
    // Le total global ne vaut pas pour un sous-ensemble : il ne doit pas y être présenté comme son total.
    expect(screen.queryByRole("rowheader", { name: "Total, même mesure que l'entonnoir" })).not.toBeInTheDocument();
    expect(screen.queryByText("55")).not.toBeInTheDocument();
  });

  it("ne remplace jamais une ligne par un zéro quand l'entonnoir est indisponible ou en cours de chargement", () => {
    const { unmount } = tableau({ totalEntonnoir: null });

    const indisponible = within(ligneDuPied("Total, même mesure que l'entonnoir")).getAllByRole("cell");
    expect(indisponible[0]).toHaveTextContent("Indisponible");
    expect(indisponible[0]).toHaveAttribute("colspan", "3");
    unmount();

    tableau({ totalEntonnoir: null, totalEntonnoirChargement: true });
    expect(within(ligneDuPied("Total, même mesure que l'entonnoir")).getAllByRole("cell")[0]).toHaveTextContent("…");
  });

  it("annonce en une phrase la part des visites hors départements pilotes, avec sa légende chiffrée", () => {
    tableau();

    // Lignes : Allier (pilote) 40, Paris 12, Bouches-du-Rhône 8 : 20 sur 60 hors pilotes, soit 33 %.
    const n = DEPARTEMENTS_ELIGIBLES_RGA.length;
    expect(
      screen.getByText(`33 % des visites avec un résultat viennent de départements hors des ${n} pilotes`)
    ).toBeInTheDocument();
    expect(screen.getByText(`${n} départements pilotes : 67 % (40)`)).toBeInTheDocument();
    expect(screen.getByText("Autres départements : 33 % (20)")).toBeInTheDocument();
    expect(screen.getByText(/Estimation sur le cumul des lignes ci-dessous/)).toBeInTheDocument();
    // La barre est décorative : tout ce qu'elle dit est déjà dans le texte.
    expect(screen.getByTestId("barre-repartition-pilotes")).toHaveAttribute("aria-hidden", "true");
  });

  it("ne fait pas varier la part avec le sélecteur de périmètre", async () => {
    tableau();

    await userEvent.selectOptions(screen.getByLabelText("Départements affichés"), "pilotes");

    expect(
      screen.getByText(/^33 % des visites avec un résultat viennent de départements hors des/)
    ).toBeInTheDocument();
  });

  it("masque la part avec un filtre département, ou sans aucune visite", () => {
    const { unmount } = tableau({ filtreDepartementActif: true });
    expect(screen.queryByText(/des visites avec un résultat viennent de départements hors/)).not.toBeInTheDocument();
    unmount();

    tableau({ departements: [stats("75", "Paris", 0, 0)] });
    expect(screen.queryByText(/des visites avec un résultat viennent de départements hors/)).not.toBeInTheDocument();
  });

  it("qualifie le titre et la colonne : cumul non dédoublonné, visites avec un résultat", () => {
    tableau();

    expect(
      screen.getByRole("heading", { level: 2, name: /Visites avec un résultat par département/ })
    ).toBeInTheDocument();
    expect(screen.getByText("Cumul non dédoublonné entre pages et départements")).toBeInTheDocument();
    expect(screen.queryByText(/Simulations par département/)).not.toBeInTheDocument();
  });

  it("explique, dans l'infobulle de la colonne, pourquoi le total peut dépasser l'entonnoir", () => {
    tableau();

    const infobulle = screen.getByText(/peut apparaître plusieurs fois/);

    expect(infobulle).toHaveAttribute("role", "tooltip");
    expect(infobulle).toHaveTextContent("le total peut dépasser celui de l'entonnoir");
    // Le lecteur d'écran n'annonce l'infobulle que si le bouton la désigne par son identifiant.
    const bouton = within(screen.getByRole("columnheader", { name: /^Visites avec un résultat/ })).getByRole("button");
    expect(infobulle.id).not.toBe("");
    expect(bouton).toHaveAttribute("aria-describedby", infobulle.id);
  });

  it("dit dans sa note que le total reprend l'entonnoir et que la somme des lignes recompte des visites", () => {
    tableau();

    const note = screen.getByText(/Somme des lignes : cumul non dédoublonné/);

    expect(note).toHaveTextContent("reprend la mesure de l'entonnoir");
    expect(note).toHaveTextContent("une visite ayant obtenu les deux résultats compte deux fois");
    expect(note).not.toHaveTextContent("Simulations terminées");
  });

  it("accorde la somme au singulier quand un seul département est affiché (filtre département)", () => {
    tableau({ departements: [DEPARTEMENTS[1]], periodeId: "30j" });

    expect(screen.getByRole("rowheader", { name: "Somme des lignes (1 département)" })).toBeInTheDocument();
  });

  it("exporte en CSV les lignes affichées, sans ligne de total, avec une colonne qualifiée", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:csv");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    tableau({ periodeId: "30j" });

    await userEvent.selectOptions(screen.getByLabelText("Départements affichés"), "pilotes");
    await userEvent.click(screen.getByRole("button", { name: "Exporter en CSV" }));

    expect(click).toHaveBeenCalledTimes(1);
    const csv = await (createObjectURL.mock.calls[0][0] as Blob).text();
    expect(csv).toContain("Visites avec un résultat (cumul non dédoublonné)");
    expect(csv).toContain("03;Allier;Oui;40;30;10;75;1;0");
    expect(csv).not.toContain("Paris");
    expect(csv).not.toMatch(/Somme des lignes|Total|Cumul des lignes/);
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toMatch(
      /^simulations-par-departement_30j_pilotes_\d{4}-\d{2}-\d{2}\.csv$/
    );
  });

  it("signale un échec de chargement sans le présenter comme un vrai vide, et propose de réessayer", async () => {
    const reessayer = vi.fn();
    tableau({ departements: null, erreur: true, onReessayer: reessayer, periodeId: "30j" });

    expect(screen.getByRole("alert")).toHaveTextContent("n'ont pas pu être chargées");
    expect(screen.queryByText("Aucune donnée disponible.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter en CSV" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(reessayer).toHaveBeenCalledTimes(1);
  });

  it("désactive l'export quand il n'y a aucune donnée", () => {
    tableau({ departements: [] });

    expect(screen.getByText("Aucune donnée disponible.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exporter en CSV" })).toBeDisabled();
  });
});
