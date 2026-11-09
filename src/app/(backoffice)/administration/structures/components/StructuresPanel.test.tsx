import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CritereHabilitation, StructureListee } from "@/features/backoffice";
import { UserRole, type AdminRole } from "@/shared/domain/value-objects/user-role.enum";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

vi.mock("@/features/backoffice", async () => ({
  ...(await import("@/features/backoffice/administration/structures/domain/regles-structures")),
  ...(await import("@/features/backoffice/administration/experts/domain/regles-experts")),
  getStructuresAction: vi.fn(),
  creerStructureAction: vi.fn(),
  importerStructuresAction: vi.fn(),
  getReferentielEpciAction: vi.fn(async () => ({
    success: true,
    data: [
      { code: "200054781", nom: "CA Bourges Plus", codesDepartements: ["18"] },
      { code: "243600236", nom: "CC du Pays d'Issoudun", codesDepartements: ["36"] },
    ],
  })),
}));

import { creerStructureAction, getStructuresAction } from "@/features/backoffice";
import StructuresPanel from "./StructuresPanel";

function structure(
  nom: string,
  habilitations: { amo?: boolean; allersVers?: boolean; expert?: boolean },
  siret: string | null = null
): StructureListee {
  return {
    id: `id-${nom}`,
    type: habilitations.expert ? "expert" : "accompagnement",
    nom,
    siret,
    habilitations: { amo: false, allersVers: false, expert: false, ...habilitations },
    expertDesactive: false,
    departements: ["36"],
    agentsActifs: 0,
  };
}

const STRUCTURES = [
  structure("Soliha Indre", { amo: true }, "12345678901234"),
  structure("Adil 36", { allersVers: true }),
  structure("Expertise Berry", { expert: true }),
];

async function nomsAffiches(): Promise<string[]> {
  const tableau = await screen.findByRole("table");
  return within(tableau)
    .getAllByRole("link")
    .map((lien) => lien.textContent ?? "");
}

// Tape dans la liste déroulante, puis choisit la première proposition au clavier.
async function choisir(champ: HTMLElement, ...recherches: string[]) {
  for (const recherche of recherches) {
    await userEvent.clear(champ);
    await userEvent.type(champ, `${recherche}{Enter}`);
  }
}

const afficher = (role: AdminRole = UserRole.SUPER_ADMINISTRATEUR, criteresInitiaux: CritereHabilitation[] = []) =>
  render(<StructuresPanel role={role} criteresInitiaux={criteresInitiaux} />);

describe("StructuresPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/administration/structures");
    vi.mocked(getStructuresAction).mockResolvedValue({ success: true, data: STRUCTURES });
  });

  it("liste toutes les structures quand aucune habilitation n'est cochée", async () => {
    afficher();

    expect(await nomsAffiches()).toEqual(["Soliha Indre", "Adil 36", "Expertise Berry"]);
    expect(screen.getByText("3 structures")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Soliha Indre" })).toHaveAttribute(
      "href",
      "/administration/structures/id-Soliha Indre"
    );
    expect(screen.queryByLabelText("Sans habilitation")).not.toBeInTheDocument();
  });

  it("précoche les critères venus de l'adresse, ceux des anciennes pages AMO, Aller-vers et Experts", async () => {
    afficher(UserRole.SUPER_ADMINISTRATEUR, ["amo"]);

    expect(await nomsAffiches()).toEqual(["Soliha Indre"]);
    expect(screen.getByRole("checkbox", { name: "AMO" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Aller-vers" })).not.toBeChecked();
  });

  it("cumule les critères cochés et les reporte dans l'adresse", async () => {
    afficher();
    await nomsAffiches();

    await userEvent.click(screen.getByRole("checkbox", { name: "Aller-vers" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Expert" }));

    expect(await nomsAffiches()).toEqual(["Adil 36", "Expertise Berry"]);
    expect(window.location.search).toBe("?habilitation=allersVers%2Cexpert");

    await userEvent.click(screen.getByRole("checkbox", { name: "Aller-vers" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Expert" }));
    expect(await nomsAffiches()).toHaveLength(3);
    expect(window.location.search).toBe("");
  });

  it("recherche par nom, sans tenir compte des accents, ou par SIRET", async () => {
    afficher();
    await nomsAffiches();

    await userEvent.type(screen.getByLabelText("Rechercher par nom ou SIRET"), "expértise");
    expect(await nomsAffiches()).toEqual(["Expertise Berry"]);

    await userEvent.clear(screen.getByLabelText("Rechercher par nom ou SIRET"));
    await userEvent.type(screen.getByLabelText("Rechercher par nom ou SIRET"), "123 456");
    expect(await nomsAffiches()).toEqual(["Soliha Indre"]);
  });

  it("crée la structure avec la première habilitation choisie, puis ouvre sa fiche", async () => {
    vi.mocked(creerStructureAction).mockResolvedValue({ success: true, data: { id: "nouvelle" } });
    afficher();
    await nomsAffiches();
    const creer = screen.getByRole("button", { name: "Créer la structure", hidden: true });

    await userEvent.type(screen.getByLabelText("Nom"), "Adil 18");
    await userEvent.click(screen.getByRole("radio", { name: "Aller-vers", hidden: true }));
    expect(creer).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/^Emails de l'équipe/), "contact@adil18.test");
    await choisir(screen.getByRole("combobox", { name: /^Départements/, hidden: true }), "cher", "36");
    await choisir(screen.getByRole("combobox", { name: /^EPCI/, hidden: true }), "issoudun");
    await userEvent.click(creer);

    await waitFor(() => expect(push).toHaveBeenCalledWith("/administration/structures/nouvelle"));
    expect(creerStructureAction).toHaveBeenCalledWith({
      identite: { nom: "Adil 18", siret: "", adresse: "", telephone: "", horaires: "" },
      habilitation: "allersVers",
      saisie: { emails: "contact@adil18.test", departements: ["18", "36"], epci: ["243600236"] },
    });
  });

  it("exige le SIRET d'une AMO à la création", async () => {
    afficher();
    await nomsAffiches();
    const creer = screen.getByRole("button", { name: "Créer la structure", hidden: true });

    await userEvent.type(screen.getByLabelText("Nom"), "Soliha Cher");
    await userEvent.click(screen.getByRole("radio", { name: "AMO", hidden: true }));
    await choisir(screen.getByRole("combobox", { name: /^Départements/, hidden: true }), "Cher 18");
    await userEvent.type(screen.getByLabelText(/^Emails de l'équipe/), "contact@soliha18.test");
    expect(creer).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/^SIRET/), "12345678900018");
    expect(creer).toBeEnabled();
  });

  it("ne propose l'expert, à la création comme à l'import, qu'au super-administrateur", async () => {
    afficher(UserRole.ADMINISTRATEUR);
    await nomsAffiches();

    expect(screen.queryByRole("radio", { name: "Expert", hidden: true })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Import AMO" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Import Aller-vers" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Import experts" })).not.toBeInTheDocument();
  });

  it("propose un import par rôle, chacun avec son modèle", async () => {
    afficher();
    await nomsAffiches();

    await userEvent.click(screen.getByRole("tab", { name: "Import experts" }));

    expect(screen.getByRole("link", { name: "Télécharger le fichier exemple" })).toHaveAttribute(
      "href",
      "/templates/experts-exemple.xlsx"
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Import AMO" }));
    expect(screen.getByRole("link", { name: "Télécharger le fichier exemple" })).toHaveAttribute(
      "href",
      "/templates/amo-exemple.xlsx"
    );
  });
});
