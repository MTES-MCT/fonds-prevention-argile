import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StepAdresse } from "./StepAdresse";
import { useSimulateurStore } from "../../../stores/simulateur.store";

const bdnb = vi.hoisted(() => ({ getBuildingDataFallback: vi.fn(), getBuildingDataByRnbId: vi.fn() }));

vi.mock("@/shared/services/bdnb", () => bdnb);
vi.mock("@/shared/adapters/geo", () => ({ getEpciByCommune: vi.fn().mockResolvedValue("243600327") }));
vi.mock("@/features/rga-map", () => ({
  RgaMapContainer: ({ onCarteIndisponible }: { onCarteIndisponible?: () => void }) => (
    <button type="button" onClick={onCarteIndisponible}>
      Simuler une carte indisponible
    </button>
  ),
}));

// Adresse déjà choisie (retour sur l'étape) : la carte s'affiche sans recherche.
const ADRESSE_CHOISIE = {
  adresse: "97 Rue de Notz",
  commune: "36044",
  commune_nom: "Châteauroux",
  code_departement: "36",
  coordonnees: "46.80,1.68",
  clef_ban: "36044_2080_00097",
};

const BATIMENT = {
  rnbId: "",
  lat: 46.8,
  lon: 1.68,
  adresse: null,
  aleaArgiles: "fort",
  anneeConstruction: null,
  nombreNiveaux: null,
  surfaceHabitable: null,
  donneesIndisponibles: true,
};

const props = { numeroEtape: 2, totalEtapes: 9, canGoBack: true, onBack: () => {} };

describe("StepAdresse", () => {
  beforeEach(() => {
    useSimulateurStore.getState().reset();
    bdnb.getBuildingDataFallback.mockReset();
  });

  it("n'affiche pas d'aide sous « Suivant » tant qu'aucune adresse n'est choisie", () => {
    render(<StepAdresse {...props} onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
    expect(screen.queryByText(/pour continuer/)).not.toBeInTheDocument();
  });

  it("demande de choisir le logement une fois l'adresse connue", () => {
    render(<StepAdresse {...props} initialValue={ADRESSE_CHOISIE} onSubmit={vi.fn()} />);

    expect(screen.getByText("Sélectionnez votre logement sur la carte pour continuer.")).toBeInTheDocument();
  });

  it("passe directement à l'écran de saisie quand l'usager choisit de renseigner lui-même", async () => {
    bdnb.getBuildingDataFallback.mockResolvedValue(BATIMENT);
    const onSubmit = vi.fn();
    render(<StepAdresse {...props} initialValue={ADRESSE_CHOISIE} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Simuler une carte indisponible" }));
    fireEvent.click(screen.getByRole("button", { name: "Renseigner les informations de mon logement" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0].logement.zone_dexposition).toBe("fort");
    expect(useSimulateurStore.getState().prefillBatiment?.donneesIndisponibles).toBe(true);
  });

  it("reste sur la carte quand l'aléa n'a pas pu être vérifié", async () => {
    bdnb.getBuildingDataFallback.mockResolvedValue({ ...BATIMENT, aleaIndetermine: true });
    const onSubmit = vi.fn();
    render(<StepAdresse {...props} initialValue={ADRESSE_CHOISIE} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Simuler une carte indisponible" }));
    fireEvent.click(screen.getByRole("button", { name: "Renseigner les informations de mon logement" }));

    expect(await screen.findByRole("button", { name: "Réessayer la vérification" })).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
