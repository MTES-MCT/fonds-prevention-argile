import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { AccessErrorCode } from "@/features/auth/permissions/domain";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { UserWithParcoursDetails } from "../domain/types/user-with-parcours.types";
import { createMockAuthUser, createEnvConfigMock } from "@/shared/testing/mocks";

// Mock des dépendances AVANT les imports
vi.mock("@/features/auth/permissions/services/permissions.service", () => ({
  checkBackofficePermission: vi.fn(),
}));

vi.mock("../services/users-tracking.service", () => ({
  getUsersWithParcours: vi.fn(),
}));

// Mock de l'environnement serveur
vi.mock("@/shared/config/env.config", () => createEnvConfigMock());

// Import des actions APRÈS les mocks
import { getUsersWithParcours } from "./users-tracking.actions";

// Import des mocks
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { getUsersWithParcours as getUsersWithParcoursService } from "../services/users-tracking.service";

describe("users-tracking.actions", () => {
  // Helper pour créer un utilisateur avec parcours de test
  const createMockUserWithParcours = (override?: Partial<UserWithParcoursDetails>): UserWithParcoursDetails => ({
    user: {
      id: "user-123",
      fcId: "fc-123",
      email: "user@example.com",
      name: "D.",
      firstName: "Jean",
      telephone: "0612345678",
      lastLogin: new Date("2024-01-15T10:00:00Z"),
      createdAt: new Date("2024-01-01T10:00:00Z"),
      updatedAt: new Date("2024-01-15T10:00:00Z"),
    },
    parcours: {
      id: "parcours-123",
      currentStep: Step.CHOIX_AMO,
      currentStatus: "in_progress",
      createdAt: new Date("2024-01-01T10:00:00Z"),
      updatedAt: new Date("2024-01-15T10:00:00Z"),
      completedAt: null,
      rgaSimulationCompletedAt: new Date("2024-01-02T10:00:00Z"),
      rgaDataDeletedAt: null,
    },
    rgaSimulation: {
      logement: {
        adresse: "1 rue de la Paix, 75001 Paris",
        code_region: "11",
        code_departement: "75",
        epci: "200054781",
        commune: "75101",
        commune_nom: "Paris 1er Arrondissement",
        coordonnees: "48.8566,2.3522",
        clef_ban: "75101_0001_00001",
        commune_denormandie: false,
        annee_de_construction: "2000",
        rnb: "RNB123456",
        niveaux: 2,
        zone_dexposition: "fort",
        type: "maison",
        mitoyen: false,
        proprietaire_occupant: true,
      },
      taxeFonciere: {
        commune_eligible: true,
      },
      rga: {
        assure: true,
        indemnise_indemnise_rga: false,
        sinistres: "saine",
        indemnise_montant_indemnite: 0,
      },
      menage: {
        revenu_rga: 45000,
        personnes: 4,
      },
      vous: {
        proprietaire_condition: true,
        proprietaire_occupant_rga: true,
      },
      simulatedAt: "2024-01-02T10:00:00Z",
    },
    amoValidation: {
      id: "amo-validation-123",
      statut: StatutValidationAmo.EN_ATTENTE,
      choisieAt: new Date("2024-01-10T10:00:00Z"),
      valideeAt: null,
      commentaire: null,
      amo: {
        id: "amo-123",
        nom: "AMO Test",
        siret: "12345678901234",
        adresse: "10 rue de l'AMO, 75002 Paris",
        emails: "contact@amo-test.fr",
        telephone: "0143210987",
      },
      userData: {
        prenom: "Jean",
        nom: "D.",
        email: "jean.dupont@example.com",
        telephone: "0612345678",
        adresseLogement: "1 rue de la Paix, 75001 Paris",
      },
      token: {
        id: "token-123",
        token: "validation-token-abc123",
        createdAt: new Date("2024-01-10T10:00:00Z"),
        expiresAt: new Date("2024-01-17T10:00:00Z"),
        usedAt: null,
      },
      emailTracking: {
        brevoMessageId: "msg-123",
        sentAt: new Date("2024-01-10T10:05:00Z"),
        deliveredAt: new Date("2024-01-10T10:10:00Z"),
        openedAt: null,
        clickedAt: null,
        bounceType: null,
        bounceReason: null,
      },
    },
    dossiers: {
      eligibilite: null,
      diagnostic: null,
      devis: null,
      factures: null,
    },
    ...override,
  });

  // Helper pour créer un utilisateur avec parcours complet
  const createMockUserWithFullParcours = (): UserWithParcoursDetails => {
    const baseUser = createMockUserWithParcours();
    return {
      ...baseUser,
      parcours: {
        ...baseUser.parcours!,
        currentStep: Step.FACTURES,
        completedAt: new Date("2024-02-01T10:00:00Z"),
      },
      amoValidation: {
        ...baseUser.amoValidation!,
        statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
        valideeAt: new Date("2024-01-12T10:00:00Z"),
        commentaire: "Logement éligible aux travaux",
        token: {
          ...baseUser.amoValidation!.token!,
          usedAt: new Date("2024-01-12T10:00:00Z"),
        },
        emailTracking: {
          ...baseUser.amoValidation!.emailTracking,
          openedAt: new Date("2024-01-11T14:30:00Z"),
          clickedAt: new Date("2024-01-11T14:35:00Z"),
        },
      },
      dossiers: {
        eligibilite: {
          id: "dossier-eligibilite-123",
          dsNumber: "DS-123456",
          dsId: "ds-id-123",
          dsStatus: "accepte",
          submittedAt: new Date("2024-01-15T10:00:00Z"),
          processedAt: new Date("2024-01-20T10:00:00Z"),
          createdAt: new Date("2024-01-15T10:00:00Z"),
          updatedAt: new Date("2024-01-20T10:00:00Z"),
          lastSyncAt: new Date("2024-01-20T10:00:00Z"),
        },
        diagnostic: {
          id: "dossier-diagnostic-123",
          dsNumber: "DS-123457",
          dsId: "ds-id-124",
          dsStatus: "en_construction",
          submittedAt: null,
          processedAt: null,
          createdAt: new Date("2024-01-22T10:00:00Z"),
          updatedAt: new Date("2024-01-25T10:00:00Z"),
          lastSyncAt: new Date("2024-01-25T10:00:00Z"),
        },
        devis: null,
        factures: null,
      },
    };
  };

  // Helper pour créer un utilisateur avec logement non éligible
  const createMockUserWithNonEligibleLogement = (): UserWithParcoursDetails => {
    const baseUser = createMockUserWithParcours();
    return {
      ...baseUser,
      amoValidation: {
        ...baseUser.amoValidation!,
        statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
        valideeAt: new Date("2024-01-12T10:00:00Z"),
        commentaire: "Le logement ne répond pas aux critères d'éligibilité",
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getUsersWithParcours", () => {
    it("devrait autoriser l'accès pour SUPER_ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUsers = [
        createMockUserWithParcours(),
        createMockUserWithParcours({
          user: {
            ...createMockUserWithParcours().user,
            id: "user-456",
            email: "autre@example.com",
          },
        }),
      ];

      vi.mocked(getUsersWithParcoursService).mockResolvedValue(mockUsers);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockUsers);
        expect(result.data).toHaveLength(2);
      }
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.USERS_READ);
      expect(getUsersWithParcoursService).toHaveBeenCalled();
    });

    it("devrait autoriser l'accès pour ADMINISTRATEUR", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUsers = [createMockUserWithParcours()];
      vi.mocked(getUsersWithParcoursService).mockResolvedValue(mockUsers);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      expect(checkBackofficePermission).toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour ANALYSTE (pas de permission USERS_READ)", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour consulter les utilisateurs",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Permission insuffisante pour consulter les utilisateurs");
      }
      expect(getUsersWithParcoursService).not.toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour AMO", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour consulter les utilisateurs",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      expect(getUsersWithParcoursService).not.toHaveBeenCalled();
    });

    it("devrait refuser l'accès pour PARTICULIER", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Permission insuffisante pour consulter les utilisateurs",
        errorCode: AccessErrorCode.INSUFFICIENT_PERMISSIONS,
      });

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      expect(getUsersWithParcoursService).not.toHaveBeenCalled();
    });

    it("devrait retourner une liste vide si aucun utilisateur", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getUsersWithParcoursService).mockResolvedValue([]);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("devrait gérer les erreurs de récupération", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getUsersWithParcoursService).mockRejectedValue(new Error("Erreur de base de données"));

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur de base de données");
      }
    });

    it("devrait gérer les erreurs inconnues", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getUsersWithParcoursService).mockRejectedValue("Erreur non-Error");

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Erreur inconnue");
      }
    });

    it("devrait gérer les timeouts de base de données", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      vi.mocked(getUsersWithParcoursService).mockRejectedValue(new Error("Connection timeout"));

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Connection timeout");
      }
    });

    it("devrait vérifier la permission USERS_READ et non USERS_STATS_READ", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUsers = [createMockUserWithParcours()];
      vi.mocked(getUsersWithParcoursService).mockResolvedValue(mockUsers);

      await getUsersWithParcours();

      // Vérifie que c'est bien USERS_READ qui est demandé (pas USERS_STATS_READ)
      expect(checkBackofficePermission).toHaveBeenCalledWith(BackofficePermission.USERS_READ);
      expect(checkBackofficePermission).not.toHaveBeenCalledWith(BackofficePermission.USERS_STATS_READ);
    });
  });

  describe("Sécurité et cas limites", () => {
    it("devrait empêcher l'accès sans authentification", async () => {
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: false,
        reason: "Utilisateur non authentifié",
        errorCode: AccessErrorCode.NOT_AUTHENTICATED,
      });

      const result = await getUsersWithParcours();

      expect(result.success).toBe(false);
      expect(getUsersWithParcoursService).not.toHaveBeenCalled();
    });

    it("devrait gérer les résultats avec des données complètes", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUserComplete = createMockUserWithFullParcours();
      vi.mocked(getUsersWithParcoursService).mockResolvedValue([mockUserComplete]);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].parcours?.currentStep).toBe(Step.FACTURES);
        expect(result.data[0].amoValidation?.statut).toBe(StatutValidationAmo.LOGEMENT_ELIGIBLE);
        expect(result.data[0].dossiers.eligibilite).not.toBeNull();
      }
    });

    it("devrait gérer un logement non éligible", async () => {
      const mockUser = createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUserNonEligible = createMockUserWithNonEligibleLogement();
      vi.mocked(getUsersWithParcoursService).mockResolvedValue([mockUserNonEligible]);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].amoValidation?.statut).toBe(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE);
        expect(result.data[0].amoValidation?.commentaire).toContain("ne répond pas aux critères");
      }
    });

    it("devrait gérer les résultats avec des données partielles", async () => {
      const mockUser = createMockAuthUser(UserRole.ADMINISTRATEUR);
      vi.mocked(checkBackofficePermission).mockResolvedValue({
        hasAccess: true,
        user: mockUser,
      });

      const mockUserPartial = createMockUserWithParcours({
        parcours: null,
        amoValidation: null,
      });

      vi.mocked(getUsersWithParcoursService).mockResolvedValue([mockUserPartial]);

      const result = await getUsersWithParcours();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].parcours).toBeNull();
        expect(result.data[0].amoValidation).toBeNull();
        expect(result.data[0].dossiers.eligibilite).toBeNull();
      }
    });
  });
});
