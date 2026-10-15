import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StepAdresseVulnerabilite } from "./StepAdresseVulnerabilite";
import { useAdresseChoisieStore } from "@/shared/stores";
import { VulnerabiliteProvider } from "../../shared/VulnerabiliteContext";

const ban = vi.hoisted(() => ({ searchAddress: vi.fn() }));
vi.mock("@/shared/adapters/ban/ban.adapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/adapters/ban/ban.adapter")>()),
  searchAddress: ban.searchAddress,
}));

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

const resultatBan = (score: number) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [1.68, 46.8] },
  properties: {
    label: "97 Rue de Notz 36000 Châteauroux",
    score,
    id: "36044_2080_00097",
    type: "housenumber",
    name: "97 Rue de Notz",
    postcode: "36000",
    citycode: "36044",
    city: "Châteauroux",
    context: "36, Indre",
  },
});

describe("StepAdresseVulnerabilite : adresse transmise par l'intégrateur de l'iframe", () => {
  beforeEach(() => {
    useAdresseChoisieStore.getState().oublier();
    ban.searchAddress.mockReset();
    carte.initialRnbId = undefined;
    window.location.hash = "#adresse=97%20rue%20de%20Notz%20Ch%C3%A2teauroux&rnb=ABCD-1234-EFGH";
  });
  afterEach(() => {
    window.location.hash = "";
  });

  it("préremplit l'adresse et présélectionne le bâtiment quand la réponse est nette", async () => {
    ban.searchAddress.mockResolvedValue([resultatBan(0.97)]);
    render(<StepAdresseVulnerabilite {...props} onSubmit={vi.fn()} />);

    expect(await screen.findByText(/Adresse renseignée par le site/)).toBeInTheDocument();
    expect(carte.initialRnbId).toBe("ABCD-1234-EFGH");
  });

  it("laisse choisir quand la réponse est ambiguë", async () => {
    ban.searchAddress.mockResolvedValue([resultatBan(0.9), resultatBan(0.89)]);
    render(<StepAdresseVulnerabilite {...props} onSubmit={vi.fn()} />);

    expect(await screen.findByText("Sélectionnez votre adresse parmi les résultats suivants :")).toBeInTheDocument();
    expect(screen.queryByText(/Adresse renseignée par le site/)).not.toBeInTheDocument();
  });

  it("n'applique pas l'adresse transmise à un test fait par un agent", () => {
    render(
      <VulnerabiliteProvider
        agent={{
          nomDemandeur: "Angela Dubois",
          adresseInitiale: null,
          enregistrer: vi.fn(),
          urlRetour: "/espace-agent/dossiers/val-1",
        }}>
        <StepAdresseVulnerabilite {...props} onSubmit={vi.fn()} />
      </VulnerabiliteProvider>
    );

    expect(ban.searchAddress).not.toHaveBeenCalled();
  });
});
