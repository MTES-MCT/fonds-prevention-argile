import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/backoffice", () => ({ importerStructuresAction: vi.fn() }));

import { importerStructuresAction } from "@/features/backoffice";
import ImportStructures from "./ImportStructures";

// jsdom bloque l'envoi d'un champ fichier « required » rempli par userEvent : on soumet le formulaire directement.
async function importer(fichier = new File(["x"], "import.xlsx")) {
  await userEvent.upload(screen.getByLabelText(/Importer un fichier Excel/), fichier);
  const bouton = screen.getByRole("button", { name: "Importer le fichier" });
  expect(bouton).toBeEnabled();
  fireEvent.submit(bouton.closest("form")!);
}

describe("ImportStructures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["amo", "/templates/amo-exemple.xlsx", "Une ligne par AMO."],
    ["allersVers", "/templates/allers-vers-exemple.xlsx", /retrouvé par son nom et un département commun/],
    ["expert", "/templates/experts-exemple.xlsx", "Le fichier de la DHUP est accepté tel quel."],
  ] as const)("propose pour le rôle %s son modèle et son aide", (role, modele, aide) => {
    render(<ImportStructures role={role} />);

    expect(screen.getByRole("link", { name: "Télécharger le fichier exemple" })).toHaveAttribute("href", modele);
    expect(screen.getByText(aide)).toBeInTheDocument();
    expect(screen.getByText("Rien n'est supprimé.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importer le fichier" })).toBeDisabled();
  });

  it("envoie le rôle, et ne remplace les coordonnées existantes que si la case est cochée", async () => {
    vi.mocked(importerStructuresAction).mockResolvedValue({ success: false, error: "Fichier vide" });
    render(<ImportStructures role="expert" />);

    await importer();
    await screen.findByText("Fichier vide");
    const sansRemplacement = vi.mocked(importerStructuresAction).mock.calls[0][0];
    expect(sansRemplacement.get("role")).toBe("expert");
    expect(sansRemplacement.get("remplacer")).toBe("non");

    await userEvent.click(
      screen.getByRole("checkbox", { name: /Remplacer les coordonnées des structures existantes/ })
    );
    fireEvent.submit(screen.getByRole("button", { name: "Importer le fichier" }).closest("form")!);
    await waitFor(() => expect(importerStructuresAction).toHaveBeenCalledTimes(2));
    expect(vi.mocked(importerStructuresAction).mock.calls[1][0].get("remplacer")).toBe("oui");
  });

  it("affiche le bilan, puis les dix premières lignes refusées et les dix premiers avertissements", async () => {
    const onImportSuccess = vi.fn();
    vi.mocked(importerStructuresAction).mockResolvedValue({
      success: true,
      data: {
        structuresCreees: 2,
        structuresMisesAJour: 1,
        habilitationsAjoutees: 3,
        habilitationsMisesAJour: 0,
        lignesRefusees: Array.from({ length: 12 }, (_, i) => ({ ligne: i + 2, motif: "SIRET invalide" })),
        avertissements: Array.from({ length: 11 }, (_, i) => `Structure ${i + 1} : téléphone du fichier différent`),
      },
    });
    render(<ImportStructures role="amo" onImportSuccess={onImportSuccess} />);

    await importer();

    expect(await screen.findByText("Import terminé")).toBeInTheDocument();
    expect(screen.getByText("2 structures créées")).toBeInTheDocument();
    expect(screen.getByText("1 structure mise à jour")).toBeInTheDocument();
    expect(screen.getByText("3 habilitations ajoutées")).toBeInTheDocument();
    expect(screen.getByText("0 habilitation mise à jour")).toBeInTheDocument();
    expect(screen.getAllByText(/^Ligne \d+ : SIRET invalide$/)).toHaveLength(10);
    expect(screen.getByText("et 2 autres")).toBeInTheDocument();
    expect(screen.getAllByText(/téléphone du fichier différent$/)).toHaveLength(10);
    expect(screen.getByText("et 1 autre")).toBeInTheDocument();
    expect(onImportSuccess).toHaveBeenCalledTimes(1);
  });

  it("affiche le refus du serveur", async () => {
    vi.mocked(importerStructuresAction).mockResolvedValue({ success: false, error: "Colonnes manquantes : nom" });
    render(<ImportStructures role="allersVers" />);

    await importer();

    expect(await screen.findByText("Erreur lors de l'import")).toBeInTheDocument();
    expect(screen.getByText("Colonnes manquantes : nom")).toBeInTheDocument();
  });
});
