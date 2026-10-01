import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StepAdresse } from "./StepAdresse";
import { useSimulateurStore } from "../../../stores/simulateur.store";

const bdnb = vi.hoisted(() => ({ getBuildingDataFallback: vi.fn(), getBuildingDataByRnbId: vi.fn() }));

vi.mock("@/shared/services/bdnb", async (importOriginal) => ({
  getRgaRiskLevel: (await importOriginal<typeof import("@/shared/services/bdnb")>()).getRgaRiskLevel,
  ...bdnb,
}));
vi.mock("@/shared/adapters/geo", () => ({ getEpciByCommune: vi.fn().mockResolvedValue("243600327") }));
vi.mock("@/features/rga-map", () => ({
  ALEA_COLORS: { fort: "#F09790", moyen: "#F6D396", faible: "#F8F775", nul: "transparent" },
  RgaMapContainer: ({
    onCarteIndisponible,
    onBuildingSelect,
  }: {
    onCarteIndisponible?: () => void;
    onBuildingSelect?: (data: unknown) => void;
  }) => (
    <>
      <button type="button" onClick={onCarteIndisponible}>
        Simuler une carte indisponible
      </button>
      <button type="button" onClick={() => onBuildingSelect?.(BATIMENT_RUE_DE_NOTZ)}>
        Cliquer le 97 rue de Notz
      </button>
      <button type="button" onClick={() => onBuildingSelect?.(BATIMENT_VOISIN)}>
        Cliquer le bâtiment voisin
      </button>
      <button type="button" onClick={() => onBuildingSelect?.(BATIMENT_SANS_ADRESSE)}>
        Cliquer un bâtiment sans adresse
      </button>
    </>
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

// Hissées : la fabrique du mock de la carte s'exécute avant les déclarations du module.
const { BATIMENT_RUE_DE_NOTZ, BATIMENT_VOISIN, BATIMENT_SANS_ADRESSE } = vi.hoisted(() => {
  const base = {
    lat: 46.8,
    lon: 1.68,
    anneeConstruction: 1975,
    nombreNiveaux: 2,
    surfaceHabitable: null,
  };
  return {
    BATIMENT_RUE_DE_NOTZ: { ...base, rnbId: "RNB1", adresse: "97 Rue de Notz 36000 Châteauroux", aleaArgiles: "fort" },
    BATIMENT_VOISIN: { ...base, rnbId: "RNB2", adresse: "99 Rue de Notz 36000 Châteauroux", aleaArgiles: "moyen" },
    BATIMENT_SANS_ADRESSE: { ...base, rnbId: "RNB3", adresse: null, aleaArgiles: null },
  };
});

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

  describe("bâtiment sélectionné sur la carte", () => {
    it("affiche l'adresse du bâtiment cliqué et son aléa", () => {
      render(<StepAdresse {...props} initialValue={ADRESSE_CHOISIE} onSubmit={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: "Cliquer le 97 rue de Notz" }));

      expect(screen.getByText("97 Rue de Notz 36000 Châteauroux")).toBeInTheDocument();
      expect(screen.getByText("ALÉA FORT")).toBeInTheDocument();
    });

    it("suit le changement de bâtiment", () => {
      render(<StepAdresse {...props} initialValue={ADRESSE_CHOISIE} onSubmit={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: "Cliquer le 97 rue de Notz" }));
      fireEvent.click(screen.getByRole("button", { name: "Cliquer le bâtiment voisin" }));

      expect(screen.getByText("99 Rue de Notz 36000 Châteauroux")).toBeInTheDocument();
      expect(screen.getByText("ALÉA MOYEN")).toBeInTheDocument();
      expect(screen.queryByText("97 Rue de Notz 36000 Châteauroux")).not.toBeInTheDocument();
    });

    it("retombe sur l'adresse recherchée quand le bâtiment n'en a pas", () => {
      render(<StepAdresse {...props} initialValue={ADRESSE_CHOISIE} onSubmit={vi.fn()} />);

      fireEvent.click(screen.getByRole("button", { name: "Cliquer un bâtiment sans adresse" }));

      expect(screen.getByText("97 Rue de Notz, Châteauroux", { selector: ".fr-badge" })).toBeInTheDocument();
      expect(screen.getByText("HORS ZONE")).toBeInTheDocument();
    });

    it("enregistre l'adresse affichée", () => {
      const onSubmit = vi.fn();
      render(<StepAdresse {...props} initialValue={ADRESSE_CHOISIE} onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole("button", { name: "Cliquer le bâtiment voisin" }));
      fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

      expect(onSubmit.mock.calls[0][0].logement.adresse).toBe("99 Rue de Notz 36000 Châteauroux");
    });
  });
});
