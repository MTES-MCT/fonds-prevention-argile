import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileAmoARattacher } from "./FileAmoARattacher";
import type { DossierARattacher } from "@/features/backoffice/administration/diagnostics/services/amo-a-rattacher.service";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";

vi.mock("@/features/backoffice/administration/diagnostics/actions/amo-a-rattacher.actions", () => ({
  rattacherAmoAction: vi.fn(),
}));

import { rattacherAmoAction } from "@/features/backoffice/administration/diagnostics/actions/amo-a-rattacher.actions";

function dossier(overrides: Partial<DossierARattacher> = {}): DossierARattacher {
  return {
    parcoursId: "11111111-1111-1111-1111-111111111111",
    demandeur: "Georges Abitbol",
    commune: "Châteauroux",
    dept: "36",
    currentStep: Step.ELIGIBILITE,
    currentStatus: Status.TODO,
    amoCible: { nom: "AMO Maison Tranquille", origine: "audit" },
    gele: false,
    ...overrides,
  };
}

describe("FileAmoARattacher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rattacherAmoAction).mockResolvedValue({ success: true, data: { amoNom: "AMO Maison Tranquille" } });
  });

  it("annonce une file vide sans afficher de tableau", () => {
    render(<FileAmoARattacher dossiers={[]} onResolved={vi.fn()} />);

    expect(screen.getByText(/Aucun dossier sans AMO en département obligatoire/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("montre l'AMO cible et sa provenance avant le clic", () => {
    render(<FileAmoARattacher dossiers={[dossier()]} onResolved={vi.fn()} />);

    expect(screen.getByText("Georges Abitbol")).toBeInTheDocument();
    expect(screen.getByText("AMO Maison Tranquille")).toBeInTheDocument();
    expect(screen.getByText("AMO d'origine")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rattacher" })).toBeEnabled();
  });

  it("distingue le repli territorial de l'AMO d'origine", () => {
    render(
      <FileAmoARattacher
        dossiers={[dossier({ amoCible: { nom: "Soliha 36", origine: "territoire" } })]}
        onResolved={vi.fn()}
      />
    );

    expect(screen.getByText("AMO du territoire")).toBeInTheDocument();
  });

  it("n'offre aucune action sur un dossier gelé, et dit pourquoi", () => {
    render(<FileAmoARattacher dossiers={[dossier({ gele: true })]} onResolved={vi.fn()} />);

    expect(screen.getByText(/Gelé — formulaire déposé/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rattacher" })).not.toBeInTheDocument();
  });

  it("désactive le bouton quand aucune AMO n'est trouvable sur le territoire", () => {
    render(<FileAmoARattacher dossiers={[dossier({ amoCible: null })]} onResolved={vi.fn()} />);

    expect(screen.getByText(/Aucune AMO sur ce territoire/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rattacher" })).toBeDisabled();
  });

  it("rattache, confirme, et demande le rechargement de la file", async () => {
    const onResolved = vi.fn();
    render(<FileAmoARattacher dossiers={[dossier()]} onResolved={onResolved} />);

    await userEvent.click(screen.getByRole("button", { name: "Rattacher" }));

    expect(rattacherAmoAction).toHaveBeenCalledWith("11111111-1111-1111-1111-111111111111");
    expect(await screen.findByText(/AMO Maison Tranquille rattachée/)).toBeInTheDocument();
    expect(onResolved).toHaveBeenCalled();
  });

  it("affiche l'erreur du service sans recharger la file", async () => {
    const onResolved = vi.fn();
    vi.mocked(rattacherAmoAction).mockResolvedValue({ success: false, error: "Formulaire d'éligibilité déposé" });
    render(<FileAmoARattacher dossiers={[dossier()]} onResolved={onResolved} />);

    await userEvent.click(screen.getByRole("button", { name: "Rattacher" }));

    expect(await screen.findByText("Formulaire d'éligibilité déposé")).toBeInTheDocument();
    expect(onResolved).not.toHaveBeenCalled();
  });
});
