import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StepAdresseVulnerabilite } from "./StepAdresseVulnerabilite";
import { useAdresseChoisieStore } from "@/shared/stores";
import { VulnerabiliteProvider } from "../../shared/VulnerabiliteContext";

const carte = vi.hoisted(() => ({ initialRnbId: undefined as string | undefined }));

vi.mock("@/features/rga-map", () => ({
  ALEA_COLORS: { fort: "#F09790", moyen: "#F6D396", faible: "#F8F775", nul: "transparent" },
  RgaMapContainer: ({
    initialRnbId,
    onBuildingSelect,
  }: {
    initialRnbId?: string;
    onBuildingSelect?: (data: unknown) => void;
  }) => {
    carte.initialRnbId = initialRnbId;
    return (
      <button
        type="button"
        onClick={() =>
          onBuildingSelect?.({
            rnbId: "RNB1",
            lat: 46.8,
            lon: 1.68,
            adresse: "97 Rue de Notz 36000 Châteauroux",
            aleaArgiles: "fort",
          })
        }>
        Cliquer le bâtiment
      </button>
    );
  },
}));

const ADRESSE_PARTAGEE = {
  label: "97 Rue de Notz 36000 Châteauroux",
  lat: 46.8,
  lon: 1.68,
  clefBan: "36044_2080_00097",
  codeInsee: "36044",
  communeNom: "Châteauroux",
  codeDepartement: "36",
  rnb: "RNB1",
  codeEpci: "243600327",
};

const props = { numeroEtape: 1, totalEtapes: 12, canGoBack: true, onBack: () => {} };

describe("StepAdresseVulnerabilite : adresse reprise du simulateur d'éligibilité", () => {
  beforeEach(() => {
    useAdresseChoisieStore.getState().oublier();
    carte.initialRnbId = undefined;
  });

  it("préremplit l'adresse et présélectionne le bâtiment sur la carte", () => {
    useAdresseChoisieStore.getState().memoriser(ADRESSE_PARTAGEE);
    render(<StepAdresseVulnerabilite {...props} onSubmit={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveValue("97 Rue de Notz 36000 Châteauroux");
    expect(carte.initialRnbId).toBe("RNB1");
  });

  it("repart d'un champ vide quand aucune adresse n'a été choisie", () => {
    render(<StepAdresseVulnerabilite {...props} onSubmit={vi.fn()} />);

    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("recalcule l'aléa depuis le bâtiment et garde l'EPCI de la même commune", () => {
    useAdresseChoisieStore.getState().memoriser(ADRESSE_PARTAGEE);
    const onSubmit = vi.fn();
    render(<StepAdresseVulnerabilite {...props} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Cliquer le bâtiment" }));
    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    expect(onSubmit.mock.calls[0][0].adresse).toMatchObject({ rnb: "RNB1", aleaRga: "fort", codeDepartement: "36" });
    expect(useAdresseChoisieStore.getState().adresse).toMatchObject({ rnb: "RNB1", codeEpci: "243600327" });
  });

  describe("test fait par un agent pour le compte d'un demandeur", () => {
    const ADRESSE_DOSSIER = { ...ADRESSE_PARTAGEE, label: "12 Rue du Dossier 36000 Châteauroux", rnb: "RNB-DOSSIER" };
    const agent = {
      nomDemandeur: "Angela Dubois",
      adresseInitiale: ADRESSE_DOSSIER,
      enregistrer: vi.fn(),
      urlRetour: "/espace-agent/dossiers/val-1",
    };

    it("ouvre l'adresse du dossier, pas celle que le navigateur a gardée d'un autre demandeur", () => {
      useAdresseChoisieStore.getState().memoriser(ADRESSE_PARTAGEE);
      render(
        <VulnerabiliteProvider agent={agent}>
          <StepAdresseVulnerabilite {...props} onSubmit={vi.fn()} />
        </VulnerabiliteProvider>
      );

      expect(screen.getByRole("textbox")).toHaveValue("12 Rue du Dossier 36000 Châteauroux");
      expect(carte.initialRnbId).toBe("RNB-DOSSIER");
    });

    it("ne laisse aucune adresse dans le navigateur de l'agent", () => {
      render(
        <VulnerabiliteProvider agent={agent}>
          <StepAdresseVulnerabilite {...props} onSubmit={vi.fn()} />
        </VulnerabiliteProvider>
      );

      fireEvent.click(screen.getByRole("button", { name: "Cliquer le bâtiment" }));
      fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

      expect(useAdresseChoisieStore.getState().adresse).toBeNull();
    });
  });
});
