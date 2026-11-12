import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/features/backoffice", () => ({ importerExpertsAction: vi.fn() }));

import { importerExpertsAction } from "@/features/backoffice";
import { ExpertsImport } from "./ExpertsImport";

// jsdom bloque l'envoi d'un champ fichier « required » rempli par userEvent : on soumet le formulaire directement.
async function importer(fichier = new File(["x"], "experts.xlsx")) {
  await userEvent.upload(screen.getByLabelText(/Importer un fichier Excel/), fichier);
  const bouton = screen.getByRole("button", { name: "Importer les données" });
  expect(bouton).toBeEnabled();
  fireEvent.submit(bouton.closest("form")!);
}

describe("ExpertsImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reprend l'écran d'import des AMO, sans case de purge", () => {
    render(<ExpertsImport />);

    expect(screen.getByRole("link", { name: "Télécharger le fichier exemple" })).toHaveAttribute(
      "href",
      "/templates/experts-exemple.xlsx"
    );
    expect(screen.getByText("Format accepté : .xlsx, 2 Mo au plus")).toBeInTheDocument();
    expect(screen.getByText(/L'import ne supprime aucun expert/)).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Importer les données" })).toBeDisabled();
  });

  it("liste toutes les lignes refusées, sans les tronquer", async () => {
    const onImportSuccess = vi.fn();
    const lignesRefusees = Array.from({ length: 12 }, (_, i) => ({ ligne: i + 2, motif: "département inconnu" }));
    vi.mocked(importerExpertsAction).mockResolvedValue({
      success: true,
      data: { crees: 2, misAJour: 1, lignesRefusees },
    });
    render(<ExpertsImport onImportSuccess={onImportSuccess} />);

    await importer();

    expect(await screen.findByText("Import réussi")).toBeInTheDocument();
    expect(screen.getByText("2 experts créés")).toBeInTheDocument();
    expect(screen.getByText("1 expert mis à jour")).toBeInTheDocument();
    expect(screen.getAllByText(/^Ligne \d+ : département inconnu$/)).toHaveLength(12);
    expect(screen.getByText("Ligne 13 : département inconnu")).toBeInTheDocument();
    expect(onImportSuccess).toHaveBeenCalledTimes(1);
  });

  it("affiche le refus du serveur", async () => {
    vi.mocked(importerExpertsAction).mockResolvedValue({
      success: false,
      error: "Colonnes manquantes : SIRET",
    });
    render(<ExpertsImport />);

    await importer();

    expect(await screen.findByText("Erreur lors de l'import")).toBeInTheDocument();
    expect(screen.getByText("Colonnes manquantes : SIRET")).toBeInTheDocument();
  });
});
