import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useSimulateurStore } from "../../stores/simulateur.store";
import { StepCaracteristiques } from "./StepCaracteristiques";

const props = { numeroEtape: 2, totalEtapes: 9, canGoBack: true, onBack: () => {} };

describe("StepCaracteristiques", () => {
  beforeEach(() => {
    useSimulateurStore.getState().reset();
    useSimulateurStore.getState().setPrefillBatiment({
      anneeConstruction: 1975,
      nombreNiveaux: 2,
      donneesIndisponibles: false,
    });
  });

  it("propose les valeurs du bâtiment choisi sur la carte, à vérifier", () => {
    render(<StepCaracteristiques {...props} onSubmit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /Veuillez vérifier les informations/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Année de construction du logement")).toHaveValue("1975");
    expect(screen.getByLabelText(/Nombre de niveaux du logement/)).toHaveValue("2");
  });

  it("fait primer une réponse déjà donnée sur la BDNB", () => {
    render(
      <StepCaracteristiques
        {...props}
        initialValue={{ annee_de_construction: "1962", niveaux: 3 }}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Année de construction du logement")).toHaveValue("1962");
    expect(screen.getByLabelText(/Nombre de niveaux du logement/)).toHaveValue("3");
  });

  it("soumet l'année corrigée et le nombre de niveaux", () => {
    const onSubmit = vi.fn();
    render(<StepCaracteristiques {...props} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Année de construction du logement"), { target: { value: "1981" } });
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    expect(onSubmit).toHaveBeenCalledWith({ logement: { annee_de_construction: "1981", niveaux: 2 } });
  });

  it("demande de compléter quand la BDNB n'a rien, sans laisser passer une année incomplète", () => {
    useSimulateurStore.getState().setPrefillBatiment({
      anneeConstruction: null,
      nombreNiveaux: null,
      donneesIndisponibles: true,
    });
    render(<StepCaracteristiques {...props} onSubmit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /Veuillez compléter/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Année de construction du logement"), { target: { value: "19" } });
    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
  });
});
