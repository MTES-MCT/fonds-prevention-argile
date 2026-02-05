import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import CalloutAmoTodo from "./CalloutAmoTodo";
import * as amoActions from "@/features/parcours/amo/actions";
import * as allersVersActions from "@/features/seo/allers-vers/actions";
import * as authClient from "@/features/auth/client";
import * as simulateurHooks from "@/features/simulateur";
import * as parcoursContext from "@/features/parcours/core/context/useParcours";

// Mock des clients DS (évite l'instanciation serveur qui appelle getServerEnv)
vi.mock("@/features/parcours/dossiers-ds/adapters/graphql/client", () => ({
  graphqlClient: {},
}));
vi.mock("@/features/parcours/dossiers-ds/adapters/rest/client", () => ({
  prefillClient: {},
}));

// Mock des dépendances
vi.mock("@/features/parcours/amo/actions", () => ({
  getAmosDisponibles: vi.fn(),
  getAmoRefusee: vi.fn(),
  choisirAmo: vi.fn(),
}));

vi.mock("@/features/seo/allers-vers/actions", () => ({
  getAllersVersByEpciWithFallbackAction: vi.fn(),
}));

vi.mock("@/features/auth/client", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/features/simulateur", () => ({
  useSimulateurRga: vi.fn(),
}));

vi.mock("@/features/parcours/core/context/useParcours", () => ({
  useParcours: vi.fn(),
}));

describe("CalloutAmoTodo", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock par défaut de useAuth
    vi.mocked(authClient.useAuth).mockReturnValue({
      user: {
        id: "user-123",
        email: "test@test.fr",
        firstName: "Jean",
        lastName: "Dupont",
      },
      isLoading: false,
      isAuthenticated: true,
    } as ReturnType<typeof authClient.useAuth>);

    // Mock par défaut de getAmoRefusee (pas de refus)
    vi.mocked(amoActions.getAmoRefusee).mockResolvedValue({
      success: true,
      data: null,
    });
  });

  // Helper pour mocker useSimulateurRga
  const mockSimulateurRga = (isLoading: boolean, commune?: string, epci?: string) => {
    vi.mocked(simulateurHooks.useSimulateurRga).mockReturnValue({
      data: commune
        ? {
            logement: {
              commune,
              epci,
              adresse: "1 rue Test",
            },
          }
        : null,
      isLoading,
    } as ReturnType<typeof simulateurHooks.useSimulateurRga>);
  };

  // Helper pour mocker useParcours
  const mockParcours = (isLoading: boolean, commune?: string, epci?: string) => {
    vi.mocked(parcoursContext.useParcours).mockReturnValue({
      parcours: commune
        ? {
            id: "parcours-123",
            userId: "user-123",
            rgaSimulationData: {
              logement: {
                commune,
                epci,
                adresse: "1 rue Test",
              },
            },
            currentStep: "CHOIX_AMO",
            currentStatus: "TODO",
            createdAt: new Date(),
            updatedAt: new Date(),
            completedAt: null,
            rgaSimulationCompletedAt: new Date(),
            rgaDataDeletedAt: null,
            rgaDataDeletionReason: null,
          }
        : null,
      isLoading,
      hasParcours: !!commune,
      hasDossiers: false,
      currentStep: null,
      lastDSStatus: null,
      statutAmo: null,
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof parcoursContext.useParcours>);
  };

  // Helper pour créer un AMO mock
  const createMockAmo = (id: string, nom: string) => ({
    id,
    nom,
    siret: "12345678901234",
    departements: "Test 00",
    emails: "test@amo.fr",
    telephone: "0123456789",
    adresse: "1 rue AMO",
  });

  // Helper pour créer un Allers Vers mock
  const createMockAllersVers = (id: string, nom: string) => ({
    id,
    nom,
    emails: ["contact@allervers.fr"],
    telephone: "0123456789",
    adresse: "1 rue Allers Vers",
  });

  describe("Cas 1 : État de chargement", () => {
    it("affiche le loader quand isLoadingRga est true", () => {
      mockSimulateurRga(true);
      mockParcours(false, "75001");

      render(<CalloutAmoTodo />);

      expect(screen.getByText("Chargement des informations...")).toBeInTheDocument();
    });

    it("affiche le loader quand isLoadingParcours est true", () => {
      mockSimulateurRga(false, "75001");
      mockParcours(true, "75001");

      render(<CalloutAmoTodo />);

      expect(screen.getByText("Chargement des informations...")).toBeInTheDocument();
    });

    it("affiche le loader quand parcours.rgaSimulationData est null", () => {
      mockSimulateurRga(false, "75001");
      mockParcours(false); // Pas de données RGA

      render(<CalloutAmoTodo />);

      expect(screen.getByText("Chargement des informations...")).toBeInTheDocument();
    });
  });

  describe("Cas 2 : Aucun AMO, aucun Allers Vers", () => {
    it("affiche le message 'AMO pas encore disponible' quand aucun contact n'est trouvé", async () => {
      mockSimulateurRga(false, "75001", undefined);
      mockParcours(false, "75001", undefined);

      vi.mocked(amoActions.getAmosDisponibles).mockResolvedValue({
        success: true,
        data: [],
      });

      vi.mocked(allersVersActions.getAllersVersByEpciWithFallbackAction).mockResolvedValue({
        success: true,
        data: [],
      });

      render(<CalloutAmoTodo />);

      await waitFor(() => {
        expect(screen.getByText("AMO pas encore disponible dans votre département")).toBeInTheDocument();
      });

      expect(screen.getByText(/Nous sommes actuellement en train de finaliser des contrats/)).toBeInTheDocument();
    });
  });

  describe("Cas 3 : Aucun AMO, Allers Vers disponibles", () => {
    it("affiche le conseiller dédié quand seul un Allers Vers est disponible", async () => {
      mockSimulateurRga(false, "82001", undefined);
      mockParcours(false, "82001", undefined);

      vi.mocked(amoActions.getAmosDisponibles).mockResolvedValue({
        success: true,
        data: [],
      });

      vi.mocked(allersVersActions.getAllersVersByEpciWithFallbackAction).mockResolvedValue({
        success: true,
        data: [createMockAllersVers("av-1", "Caue Tarn-et-Garonne")],
      });

      render(<CalloutAmoTodo />);

      await waitFor(() => {
        expect(screen.getByText("Contactez votre conseiller dédié")).toBeInTheDocument();
      });

      expect(screen.getByText("Votre conseiller local mandaté par l'État :")).toBeInTheDocument();
      expect(screen.getByText("Caue Tarn-et-Garonne")).toBeInTheDocument();
    });

    it("affiche plusieurs conseillers si plusieurs Allers Vers sont disponibles", async () => {
      mockSimulateurRga(false, "36001", undefined);
      mockParcours(false, "36001", undefined);

      vi.mocked(amoActions.getAmosDisponibles).mockResolvedValue({
        success: true,
        data: [],
      });

      vi.mocked(allersVersActions.getAllersVersByEpciWithFallbackAction).mockResolvedValue({
        success: true,
        data: [createMockAllersVers("av-1", "Adil 36"), createMockAllersVers("av-2", "Soliha 36")],
      });

      render(<CalloutAmoTodo />);

      await waitFor(() => {
        expect(screen.getByText("Adil 36")).toBeInTheDocument();
        expect(screen.getByText("Soliha 36")).toBeInTheDocument();
      });

      expect(screen.getByText("Vos conseillers locaux mandatés par l'État :")).toBeInTheDocument();
    });
  });

  describe("Cas 4 : AMO disponibles", () => {
    it("affiche le callout jaune avec les AMO quand disponibles", async () => {
      mockSimulateurRga(false, "24001", undefined);
      mockParcours(false, "24001", undefined);

      vi.mocked(amoActions.getAmosDisponibles).mockResolvedValue({
        success: true,
        data: [createMockAmo("amo-1", "Soliha Dordogne")],
      });

      render(<CalloutAmoTodo />);

      await waitFor(() => {
        expect(screen.getByText("Contactez un AMO")).toBeInTheDocument();
      });

      expect(screen.getByText("Soliha Dordogne")).toBeInTheDocument();
      expect(screen.getByRole("radio")).toBeInTheDocument();
    });

    it("affiche plusieurs AMO avec des radio buttons", async () => {
      mockSimulateurRga(false, "32001", undefined);
      mockParcours(false, "32001", undefined);

      vi.mocked(amoActions.getAmosDisponibles).mockResolvedValue({
        success: true,
        data: [createMockAmo("amo-1", "AMO 1"), createMockAmo("amo-2", "AMO 2"), createMockAmo("amo-3", "AMO 3")],
      });

      render(<CalloutAmoTodo />);

      await waitFor(() => {
        expect(screen.getByText("AMO 1")).toBeInTheDocument();
        expect(screen.getByText("AMO 2")).toBeInTheDocument();
        expect(screen.getByText("AMO 3")).toBeInTheDocument();
      });

      expect(screen.getAllByRole("radio")).toHaveLength(3);
    });
  });

  describe("Cas 5 : AMO refusé", () => {
    it("affiche le message de refus et filtre l'AMO refusé de la liste", async () => {
      mockSimulateurRga(false, "36001", undefined);
      mockParcours(false, "36001", undefined);

      vi.mocked(amoActions.getAmoRefusee).mockResolvedValue({
        success: true,
        data: { id: "amo-refused", nom: "AMO Refusé" },
      });

      vi.mocked(amoActions.getAmosDisponibles).mockResolvedValue({
        success: true,
        data: [createMockAmo("amo-refused", "AMO Refusé"), createMockAmo("amo-available", "AMO Disponible")],
      });

      render(<CalloutAmoTodo accompagnementRefuse={true} />);

      await waitFor(() => {
        expect(screen.getByText(/L'AMO "AMO Refusé" a refusé la demande/)).toBeInTheDocument();
      });

      // L'AMO refusé ne doit pas apparaître dans la liste
      expect(screen.queryByText("AMO Refusé")).not.toBeInTheDocument();
      // L'AMO disponible doit apparaître
      expect(screen.getByText("AMO Disponible")).toBeInTheDocument();
    });
  });

  describe("Cas 6 : Gestion des erreurs", () => {
    it("affiche une erreur quand getAmosDisponibles échoue", async () => {
      mockSimulateurRga(false, "36001", undefined);
      mockParcours(false, "36001", undefined);

      vi.mocked(amoActions.getAmosDisponibles).mockResolvedValue({
        success: false,
        error: "Erreur serveur",
      });

      render(<CalloutAmoTodo />);

      await waitFor(() => {
        expect(screen.getByText("Erreur")).toBeInTheDocument();
        expect(screen.getByText("Erreur serveur")).toBeInTheDocument();
      });
    });
  });

  describe("Cas 7 : Pas d'appel Allers Vers si AMO disponibles", () => {
    it("ne charge pas les Allers Vers si des AMO sont disponibles", async () => {
      mockSimulateurRga(false, "32001", undefined);
      mockParcours(false, "32001", undefined);

      vi.mocked(amoActions.getAmosDisponibles).mockResolvedValue({
        success: true,
        data: [createMockAmo("amo-1", "AMO Test")],
      });

      render(<CalloutAmoTodo />);

      await waitFor(() => {
        expect(screen.getByText("AMO Test")).toBeInTheDocument();
      });

      // getAllersVersByEpciWithFallbackAction ne doit PAS être appelé
      expect(allersVersActions.getAllersVersByEpciWithFallbackAction).not.toHaveBeenCalled();
    });
  });
});
