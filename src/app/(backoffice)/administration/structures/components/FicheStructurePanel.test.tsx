import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ExpertAnnuaire, ExpertGestion, FicheStructure } from "@/features/backoffice";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

vi.mock("@/features/backoffice", async () => ({
  ...(await import("@/features/backoffice/administration/structures/domain/regles-structures")),
  ...(await import("@/features/backoffice/administration/experts/domain/regles-experts")),
  getFicheStructureAction: vi.fn(),
  modifierIdentiteAction: vi.fn(),
  ajouterHabilitationAction: vi.fn(),
  modifierHabilitationAction: vi.fn(),
  retirerHabilitationAction: vi.fn(),
  supprimerStructureAction: vi.fn(),
  desactiverExpertAction: vi.fn(),
  reactiverExpertAction: vi.fn(),
  getReferentielEpciAction: vi.fn(async () => ({
    success: true,
    data: [{ code: "243600236", nom: "CC du Pays d'Issoudun", codesDepartements: ["36"] }],
  })),
}));

import { getFicheStructureAction, retirerHabilitationAction } from "@/features/backoffice";
import FicheStructurePanel from "./FicheStructurePanel";

const AGENTS = [
  { id: "ag-1", nomComplet: "Marie Martin", email: "marie@soliha.test", desactive: false },
  { id: "ag-2", nomComplet: "Jean Dupont", email: "jean@soliha.test", desactive: true },
];

const ALLERS_VERS = { id: "av-1", emails: ["av@soliha.test"], departements: ["36", "3"], epci: [], libelleZone: null };

const EXPERT_ANNUAIRE: ExpertAnnuaire = {
  id: "ex-1",
  nom: "Expertise Berry",
  siret: "98765432109876",
  dateValidationDhup: "2026-03-01",
  departements: [{ code: "36", nom: "Indre", email: "rdv@expertise.test", telephone: null }],
};

const EXPERT_GESTION: ExpertGestion = {
  ...EXPERT_ANNUAIRE,
  contactInterne: { nom: "Paul Durand", email: "paul@expertise.test", telephone: null },
  desactivation: null,
};

const IDENTITE = {
  nom: "Soliha Indre",
  siret: "12345678901234",
  adresse: "1 rue de la Gare, 36000 Châteauroux",
  telephone: "02 54 00 00 00",
  horaires: "Du lundi au vendredi 9h - 12h",
};

function accompagnement(surcharge: Partial<FicheStructure> = {}): FicheStructure {
  return {
    id: "structure-1",
    type: "accompagnement",
    identite: IDENTITE,
    amo: {
      id: "amo-1",
      departements: "Indre 36",
      emails: ["contact@soliha.test"],
      communes: [],
      epci: [],
      dossiersSuivis: 3,
    },
    allersVers: null,
    expert: null,
    nombreAgents: 2,
    suppressionPossible: false,
    siretObligatoire: true,
    agents: AGENTS,
    ...surcharge,
  };
}

function expert(donnees: ExpertGestion | ExpertAnnuaire, surcharge: Partial<FicheStructure> = {}): FicheStructure {
  return {
    id: "structure-2",
    type: "expert",
    identite: { ...IDENTITE, nom: "Expertise Berry", siret: "98765432109876" },
    amo: null,
    allersVers: null,
    expert: donnees,
    nombreAgents: 0,
    suppressionPossible: true,
    siretObligatoire: true,
    agents: [],
    ...surcharge,
  };
}

async function afficher(donnees: FicheStructure, role: UserRole.SUPER_ADMINISTRATEUR | UserRole.ADMINISTRATEUR) {
  vi.mocked(getFicheStructureAction).mockResolvedValue({ success: true, data: donnees });
  render(<FicheStructurePanel structureId={donnees.id} role={role} />);
  await screen.findByRole("heading", { level: 2, name: "Coordonnées" });
}

async function ouvrirGerer() {
  await userEvent.click(screen.getByRole("button", { name: "Gérer la structure" }));
}

function bloc(titre: string): HTMLElement {
  const titreBloc = screen.getAllByRole("heading", { level: 2 }).find((h) => h.textContent?.startsWith(titre));
  if (!titreBloc) throw new Error(`Bloc « ${titre} » absent`);
  return titreBloc.closest("section") as HTMLElement;
}

const DERNIERE = "Dernière habilitation : pour la retirer, supprimez la structure";

describe("FicheStructurePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("montre au super-administrateur l'identité, les habilitations et les agents nommés", async () => {
    await afficher(
      accompagnement({
        amo: {
          ...accompagnement().amo!,
          departements: "Indre 36, Alpes-Maritimes 06",
          epci: ["243600236", "999999999"],
        },
        allersVers: { ...ALLERS_VERS, libelleZone: "Pour la métropole de Nancy" },
      }),
      UserRole.SUPER_ADMINISTRATEUR
    );

    expect(screen.getByRole("heading", { level: 1, name: "Soliha Indre" })).toBeInTheDocument();
    expect(screen.getByText("Structure d'accompagnement")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Ses agents ont le rôle AMO et Aller-vers" })
    ).toBeInTheDocument();
    expect(within(bloc("Coordonnées")).getByText("1 rue de la Gare, 36000 Châteauroux")).toBeInTheDocument();

    const amo = bloc("Habilitation AMO");
    expect(within(amo).getByText("36 - Indre")).toBeInTheDocument();
    // Une couverture stockée « 3 » reste l'Allier, du dispositif ; un département hors du dispositif est signalé.
    expect(within(bloc("Habilitation Aller-vers")).getByText("03 - Allier")).toBeInTheDocument();
    expect(within(bloc("Habilitation Aller-vers")).getByText("Pour la métropole de Nancy")).toBeInTheDocument();
    expect(within(amo).getByText("06 - Alpes-Maritimes (hors dispositif)")).toBeInTheDocument();
    // L'EPCI est nommé par l'API Géo ; un code qu'elle ne connaît pas reste lisible.
    expect(await within(amo).findByText("CC du Pays d'Issoudun")).toBeInTheDocument();
    expect(within(amo).getByText("EPCI inconnu de l'API Géo")).toBeInTheDocument();
    expect(within(amo).getByRole("button", { name: "Retirer" })).toBeInTheDocument();
    expect(within(bloc("Habilitation Aller-vers")).getByRole("button", { name: "Retirer" })).toBeInTheDocument();

    const agents = bloc("Agents");
    expect(within(agents).getByText("Marie Martin")).toBeInTheDocument();
    expect(within(agents).getByRole("link", { name: "Gérer les agents" })).toHaveAttribute(
      "href",
      "/administration/agents"
    );
    // Rien à ajouter, rien à supprimer : pas de menu.
    expect(screen.queryByRole("button", { name: "Gérer la structure" })).not.toBeInTheDocument();
  });

  it("ne propose pas à l'administrateur d'ajouter ou retirer AMO et Aller-vers sur une structure qui a des agents", async () => {
    await afficher(accompagnement({ allersVers: ALLERS_VERS, agents: null }), UserRole.ADMINISTRATEUR);

    const amo = bloc("Habilitation AMO");
    expect(within(amo).getByRole("button", { name: "Modifier" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retirer" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gérer la structure" })).not.toBeInTheDocument();
    expect(screen.getByText(/seul un super-administrateur peut lui ajouter ou retirer/)).toBeInTheDocument();
    expect(within(bloc("Agents")).getByText("2 agents")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Gérer les agents" })).not.toBeInTheDocument();
  });

  it("rend « Retirer » indisponible sur la dernière habilitation", async () => {
    await afficher(accompagnement(), UserRole.SUPER_ADMINISTRATEUR);

    const amo = bloc("Habilitation AMO");
    expect(within(amo).queryByRole("button", { name: "Retirer" })).not.toBeInTheDocument();
    expect(within(amo).getByText(DERNIERE)).toBeInTheDocument();
  });

  it("annonce le rôle restant des agents avant de retirer l'Aller-vers d'une AMO", async () => {
    vi.mocked(retirerHabilitationAction).mockResolvedValue({ success: true, data: undefined });
    await afficher(accompagnement({ allersVers: ALLERS_VERS }), UserRole.SUPER_ADMINISTRATEUR);

    await userEvent.click(within(bloc("Habilitation Aller-vers")).getByRole("button", { name: "Retirer" }));

    expect(screen.getByText(/^Ses 2 agents auront le rôle AMO dès ce retrait/)).toBeInTheDocument();
    const dialogue = document.getElementById("modal-retrait-habilitation") as HTMLElement;
    await userEvent.click(within(dialogue).getByRole("button", { name: "Retirer", hidden: true }));
    await waitFor(() =>
      expect(retirerHabilitationAction).toHaveBeenCalledWith({ structureId: "structure-1", habilitation: "allersVers" })
    );
  });

  it("annonce le rôle cumulé des agents avant d'ajouter un Aller-vers à une AMO", async () => {
    await afficher(accompagnement(), UserRole.SUPER_ADMINISTRATEUR);

    await ouvrirGerer();
    await userEvent.click(screen.getByRole("button", { name: "Ajouter l'habilitation Aller-vers" }));

    expect(
      screen.getByText(
        "Ses 2 agents auront le rôle AMO et Aller-vers dès cet ajout : Marie Martin, Jean Dupont (désactivé, à sa réactivation)."
      )
    ).toBeInTheDocument();
  });

  it("ne propose à une structure d'accompagnement que ses habilitations absentes, l'AMO seulement avec un SIRET", async () => {
    await afficher(
      accompagnement({
        identite: { ...IDENTITE, siret: null },
        amo: null,
        allersVers: ALLERS_VERS,
        nombreAgents: 0,
        agents: null,
        suppressionPossible: true,
        siretObligatoire: false,
      }),
      UserRole.ADMINISTRATEUR
    );

    await ouvrirGerer();
    expect(
      screen.getByRole("button", { name: "Ajouter l'habilitation AMO (renseignez d'abord le SIRET)" })
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Ajouter l'habilitation Aller-vers" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajouter l'habilitation Expert" })).not.toBeInTheDocument();
    expect(within(bloc("Habilitation Aller-vers")).getByText(DERNIERE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Supprimer la structure" })).toBeInTheDocument();
  });

  it("ne propose sur la fiche d'une structure expert ni AMO ni Aller-vers", async () => {
    await afficher(expert(EXPERT_GESTION), UserRole.SUPER_ADMINISTRATEUR);

    expect(screen.getByText("Structure expert")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: /Habilitation AMO/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: /Habilitation Aller-vers/ })).not.toBeInTheDocument();
    await ouvrirGerer();
    expect(screen.queryByRole("button", { name: /Ajouter l'habilitation/ })).not.toBeInTheDocument();

    const carte = bloc("Habilitation Expert");
    expect(within(carte).getByText("Paul Durand · paul@expertise.test")).toBeInTheDocument();
    expect(within(carte).getByRole("button", { name: "Modifier" })).toBeInTheDocument();
    expect(within(carte).getByRole("button", { name: "Désactiver" })).toBeInTheDocument();
    // Pas de compte expert : la fiche ne propose pas de gérer des agents.
    expect(screen.queryByRole("heading", { level: 2, name: /^Agents/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Annuaire des experts" })).toBeInTheDocument();
  });

  it("annonce que la suppression emporte les habilitations de la structure", async () => {
    await afficher(expert(EXPERT_GESTION), UserRole.SUPER_ADMINISTRATEUR);

    await ouvrirGerer();
    await userEvent.click(screen.getByRole("button", { name: "Supprimer la structure" }));

    expect(
      screen.getByText(/« Expertise Berry » sera supprimée définitivement, avec son habilitation Expert\./)
    ).toBeInTheDocument();
  });

  it("montre une structure expert à l'administrateur en lecture seule, sans contact interne ni suppression", async () => {
    await afficher(expert(EXPERT_ANNUAIRE, { agents: null }), UserRole.ADMINISTRATEUR);

    const carte = bloc("Habilitation Expert");
    expect(within(carte).getByRole("cell", { name: "36 - Indre" })).toBeInTheDocument();
    expect(within(carte).getByRole("cell", { name: "rdv@expertise.test" })).toBeInTheDocument();
    expect(within(carte).queryByRole("button")).not.toBeInTheDocument();
    expect(within(carte).queryByText("Contact interne")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gérer la structure" })).not.toBeInTheDocument();
  });

  it("propose le retour à la liste quand la structure est introuvable", async () => {
    vi.mocked(getFicheStructureAction).mockResolvedValue({ success: false, error: "Structure introuvable" });
    render(<FicheStructurePanel structureId="inconnue" role={UserRole.SUPER_ADMINISTRATEUR} />);

    expect(await screen.findByText("Structure introuvable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à la liste des structures" })).toHaveAttribute(
      "href",
      "/administration/structures"
    );
  });
});
