import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import { Step } from "@/shared/domain/value-objects/step.enum";

const getCentres = vi.hoisted(() => vi.fn());
vi.mock("@/features/backoffice/administration/demandeurs/actions", () => ({ getCentresCommunesAction: getCentres }));
// La carte elle-même (WebGL) est hors de portée de jsdom : on ne vérifie que ce qu'elle reçoit.
vi.mock("next/dynamic", () => ({
  default: () =>
    function CarteStub({ carte }: { carte: { features: unknown[] } }) {
      return <p>{carte.features.length} points sur la carte</p>;
    },
}));

import { CarteDemandeursTab } from "./CarteDemandeursTab";

function demandeur(commune: string | null, etape: Step, archive = false): UserWithParcoursDetails {
  return {
    user: { createdAt: new Date() },
    parcours: { createdAt: new Date(), currentStep: etape, archivedAt: archive ? new Date() : null },
    rgaSimulation: commune
      ? { logement: { commune, commune_nom: commune === "03185" ? "Montluçon" : "Moulins", code_departement: "03" } }
      : null,
  } as unknown as UserWithParcoursDetails;
}

const USERS = [
  demandeur("03185", Step.CHOIX_AMO),
  demandeur("03185", Step.ELIGIBILITE),
  demandeur("03190", Step.ELIGIBILITE),
  demandeur("03190", Step.ELIGIBILITE, true),
  demandeur(null, Step.ELIGIBILITE),
];

describe("CarteDemandeursTab", () => {
  beforeEach(() => {
    getCentres.mockReset();
    getCentres.mockResolvedValue({
      success: true,
      data: { centres: { "03185": [2.6, 46.34], "03190": [3.33, 46.56] }, departementsEnEchec: [] },
    });
  });

  it("compte les demandeurs localisés par commune, sans les dossiers archivés", async () => {
    render(<CarteDemandeursTab users={USERS} periodeId="tout" codeDepartement="" etape="" />);

    expect(await screen.findByText("3 demandeurs dans 2 communes")).toBeInTheDocument();
    expect(screen.getByText("2 points sur la carte")).toBeInTheDocument();
    expect(screen.getByText("Montluçon (03) : 2")).toBeInTheDocument();
    expect(getCentres).toHaveBeenCalledTimes(1);
    expect(getCentres).toHaveBeenCalledWith(["03185", "03190"]);
  });

  it("applique le filtre d'étape sans redemander des communes déjà placées", async () => {
    const { rerender } = render(<CarteDemandeursTab users={USERS} periodeId="tout" codeDepartement="" etape="" />);
    await screen.findByText("3 demandeurs dans 2 communes");

    rerender(<CarteDemandeursTab users={USERS} periodeId="tout" codeDepartement="" etape={Step.CHOIX_AMO} />);

    expect(screen.getByText("1 demandeur dans 1 commune")).toBeInTheDocument();
    expect(getCentres).toHaveBeenCalledTimes(1);
  });

  it("n'affiche pas une commune dont le centre est inconnu", async () => {
    getCentres.mockResolvedValue({
      success: true,
      data: { centres: { "03185": [2.6, 46.34] }, departementsEnEchec: [] },
    });

    render(<CarteDemandeursTab users={USERS} periodeId="tout" codeDepartement="" etape="" />);

    expect(await screen.findByText("2 demandeurs dans 1 commune")).toBeInTheDocument();
    expect(screen.queryByText(/Moulins/)).not.toBeInTheDocument();
  });

  it("signale les départements dont les communes n'ont pas pu être placées", async () => {
    getCentres.mockResolvedValue({ success: true, data: { centres: {}, departementsEnEchec: ["03"] } });

    render(<CarteDemandeursTab users={USERS} periodeId="tout" codeDepartement="" etape="" />);

    await waitFor(() => expect(screen.getByText(/Les communes de 03 n'ont pas pu être placées/)).toBeInTheDocument());
  });
});
