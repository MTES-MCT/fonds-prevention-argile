import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import VulnerabiliteMaListe from "./VulnerabiliteMaListe";
import { getEtatMaVulnerabiliteAction, type EtatMaVulnerabilite } from "../../actions/ma-vulnerabilite.actions";

const active = vi.hoisted(() => vi.fn(() => true));

vi.mock("../../actions/ma-vulnerabilite.actions", () => ({ getEtatMaVulnerabiliteAction: vi.fn() }));
vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: active,
}));

const COMPTE_VIDE = { critique: 0, vigilance: 0, a_verifier: 0, bonne_pratique: 0 };

function repondre(data: EtatMaVulnerabilite) {
  vi.mocked(getEtatMaVulnerabiliteAction).mockResolvedValue({ success: true, data });
}

describe("VulnerabiliteMaListe", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    active.mockReturnValue(true);
  });

  it("propose le test, facultatif, tant qu'il n'est pas fait", async () => {
    repondre({ resume: null, adresse: null });
    render(<VulnerabiliteMaListe />);

    expect(await screen.findByText("Tester la vulnérabilité de mon logement")).toBeInTheDocument();
    expect(screen.getByText("Facultatif")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Faire le test (5 min)" })).toBeInTheDocument();
  });

  it("résume le test avec des points à traiter, sans aucun score", async () => {
    repondre({
      adresse: null,
      resume: {
        niveau: "critique",
        compte: { ...COMPTE_VIDE, critique: 2, vigilance: 1 },
        pointsPrioritaires: ["Gouttières", "Végétation en pied de façade"],
        date: "2026-09-14T10:00:00.000Z",
      },
    });
    render(<VulnerabiliteMaListe />);

    expect(await screen.findByText("2 points critiques")).toBeInTheDocument();
    expect(screen.getByText("1 point de vigilance")).toBeInTheDocument();
    expect(screen.getByText("Test de vulnérabilité (14/09/2026)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir le détail" })).toHaveAttribute("href", "/mon-compte/vulnerabilite");
    expect(screen.queryByText(/\/100/)).not.toBeInTheDocument();
  });

  it("félicite quand aucun point critique ni de vigilance n'est relevé", async () => {
    repondre({
      adresse: null,
      resume: { niveau: "aucun", compte: COMPTE_VIDE, pointsPrioritaires: [], date: "2026-09-14T10:00:00.000Z" },
    });
    render(<VulnerabiliteMaListe />);

    expect(await screen.findByText("Aucun point critique")).toBeInTheDocument();
    expect(screen.getByText("Vous êtes au top, bravo !")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voir plus" })).toBeInTheDocument();
  });

  it("n'affiche rien, et ne lit rien, quand la feature est inactive", async () => {
    active.mockReturnValue(false);
    render(<VulnerabiliteMaListe />);

    await waitFor(() => expect(getEtatMaVulnerabiliteAction).not.toHaveBeenCalled());
    expect(screen.queryByTestId("vulnerabilite-ma-liste")).not.toBeInTheDocument();
  });

  it("n'affiche rien quand la lecture échoue", async () => {
    vi.mocked(getEtatMaVulnerabiliteAction).mockResolvedValue({ success: false, error: "Non connecté" });
    render(<VulnerabiliteMaListe />);

    await waitFor(() => expect(getEtatMaVulnerabiliteAction).toHaveBeenCalled());
    expect(screen.queryByTestId("vulnerabilite-ma-liste")).not.toBeInTheDocument();
  });
});
