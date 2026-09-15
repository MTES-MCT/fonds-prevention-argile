import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { RecreerFormulaireModal } from "./RecreerFormulaireModal";
import { recreerFormulaireAction } from "../../actions/recreation-formulaire.actions";

vi.mock("../../actions/recreation-formulaire.actions", () => ({ recreerFormulaireAction: vi.fn() }));
const dossierCourant = { createdAt: new Date("2026-09-15T10:00:00Z") };
vi.mock("../../context/useParcours", () => ({
  useParcours: () => ({ refresh: vi.fn(), getDossierByStep: () => dossierCourant }),
}));
// Le DSFR n'est pas initialisé en test : le `<dialog>` reste fermé, donc hors de l'arbre
// d'accessibilité. Les requêtes par rôle passent par `hidden: true`.
vi.mock("@/shared/hooks", () => ({ useDsfrModal: vi.fn() }));

const mockedAction = vi.mocked(recreerFormulaireAction);

const URL_DN = "https://demarche.numerique.gouv.fr/commencer/x";

/** Onglet pré-ouvert : le code y écrit un message d'attente puis le redirige vers DN. */
function ongletFactice() {
  return {
    opener: {} as unknown,
    closed: false,
    location: { href: "" },
    document: { title: "", body: { innerHTML: "" } },
    close: vi.fn(),
  };
}

function rendre() {
  render(<RecreerFormulaireModal isOpen onClose={vi.fn()} step={Step.ELIGIBILITE} />);
  return screen.getByRole("button", { name: "Créer un nouveau formulaire", hidden: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.open = vi.fn().mockReturnValue(null);
  // Lien créé il y a longtemps : le plancher anti double-clic ne s'applique pas.
  vi.setSystemTime(new Date("2026-09-15T10:05:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("RecreerFormulaireModal", () => {
  it("prévient de la perte du brouillon avant de confirmer", () => {
    rendre();

    expect(screen.getByText(/ne sera pas repris/)).toBeInTheDocument();
    expect(screen.getByText(/ancien numéro de dossier reste conservé/)).toBeInTheDocument();
  });

  it("recrée le formulaire de l'étape affichée et garde le lien sous la main", async () => {
    mockedAction.mockResolvedValue({
      success: true,
      data: { statut: "recree", dossierUrl: URL_DN, ancienDsNumber: "32872663", step: Step.ELIGIBILITE },
    });

    fireEvent.click(rendre());

    await waitFor(() =>
      expect(screen.getByRole("link", { name: /cliquez ici/, hidden: true })).toHaveAttribute("href", URL_DN)
    );
    expect(mockedAction).toHaveBeenCalledWith(Step.ELIGIBILITE);
  });

  it("annonce le rattachement quand un ancien numéro avait été déposé", async () => {
    mockedAction.mockResolvedValue({
      success: true,
      data: { statut: "rattache", dsNumber: "32052358", step: Step.ELIGIBILITE },
    });

    fireEvent.click(rendre());

    await waitFor(() => expect(screen.getByText(/32052358/)).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /cliquez ici/, hidden: true })).not.toBeInTheDocument();
  });

  // Sans ce décompte, le refus serveur arrivait après l'ouverture de l'onglet DN, qui se
  // refermait aussitôt sans explication lisible.
  it("verrouille le bouton tant que le lien vient d'être créé", () => {
    vi.setSystemTime(new Date("2026-09-15T10:00:10Z"));

    render(<RecreerFormulaireModal isOpen onClose={vi.fn()} step={Step.ELIGIBILITE} />);

    expect(screen.getByRole("button", { name: "Disponible dans 20 s", hidden: true })).toBeDisabled();
    expect(screen.getByText(/essayez d'abord de l'ouvrir/)).toBeInTheDocument();
    expect(window.open).not.toHaveBeenCalled();
  });

  // Un `window.open` pré-ouvert ne prend pas l'option `noopener` : la page DN garderait la
  // main sur notre onglet (tabnabbing).
  it("coupe le lien vers l'onglet d'origine avant de charger DN", async () => {
    const onglet = ongletFactice();
    window.open = vi.fn().mockReturnValue(onglet);
    mockedAction.mockResolvedValue({
      success: true,
      data: { statut: "recree", dossierUrl: URL_DN, ancienDsNumber: "32872663", step: Step.ELIGIBILITE },
    });

    fireEvent.click(rendre());

    await waitFor(() => expect(onglet.location.href).toBe(URL_DN));
    expect(onglet.opener).toBeNull();
  });

  // Le refus s'affichait en rouge tout en haut du callout, loin du bouton cliqué.
  it("affiche le refus dans la modale, à côté du bouton", async () => {
    mockedAction.mockResolvedValue({ success: false, error: "Votre dossier a déjà été transmis" });

    fireEvent.click(rendre());

    await waitFor(() => expect(screen.getByText("Votre dossier a déjà été transmis")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Créer un nouveau formulaire", hidden: true })).toBeInTheDocument();
  });
});
