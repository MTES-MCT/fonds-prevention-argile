import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DossiersPanel } from "./DossiersPanel";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/espace-agent/dossiers",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const getDossiersTerritoireDataAction = vi.fn();
vi.mock("@/features/backoffice/espace-agent/dossiers/actions/get-dossiers-territoire-data.action", () => ({
  getDossiersTerritoireDataAction: (...args: unknown[]) => getDossiersTerritoireDataAction(...args),
}));

function makeDossier(overrides: Partial<DossierItem>): DossierItem {
  return {
    parcoursId: "p1",
    particulier: { prenom: "Jean", nom: "Dupont", email: "jean.dupont@example.com", telephone: null },
    logement: { commune: "Issoudun", codeDepartement: "36", codeEpci: null },
    currentStep: Step.ELIGIBILITE,
    currentStatus: Status.EN_INSTRUCTION,
    situationParticulier: SituationParticulier.PROSPECT,
    validation: null,
    dsStatus: null,
    dossierCreatedAt: null,
    submittedAt: null,
    instructedAt: null,
    createdByAgentId: null,
    archivedAt: null,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-20"),
    responsable: { type: "INDETERMINE" },
    etat: "DDT",
    canActAsResponsable: false,
    derniereAction: null,
    ...overrides,
  };
}

describe("DossiersPanel — recherche", () => {
  it("filtre par email, en plus du nom et de la commune", async () => {
    getDossiersTerritoireDataAction.mockResolvedValue({
      success: true,
      data: {
        dossiers: [
          makeDossier({
            parcoursId: "p1",
            particulier: { prenom: "Jean", nom: "Dupont", email: "jean.dupont@example.com", telephone: null },
            logement: { commune: "Issoudun", codeDepartement: "36", codeEpci: null },
          }),
          makeDossier({
            parcoursId: "p2",
            particulier: { prenom: "Marie", nom: "Martin", email: "marie.martin@autre.fr", telephone: null },
            logement: { commune: "Châteauroux", codeDepartement: "36", codeEpci: null },
          }),
        ],
        total: 2,
        epcisDisponibles: [],
      },
    });

    render(<DossiersPanel prenom="Alex" />);

    await waitFor(() => expect(screen.getByLabelText("Rechercher")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Jean Dupont" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Marie Martin" })).toBeInTheDocument();

    const search = screen.getByLabelText("Rechercher");
    await userEvent.type(search, "marie.martin@autre.fr");

    await waitFor(() => {
      expect(screen.queryByRole("link", { name: "Jean Dupont" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Marie Martin" })).toBeInTheDocument();
    });
  });
});
