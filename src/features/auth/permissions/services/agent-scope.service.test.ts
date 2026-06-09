import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { AgentScope, AgentScopeInput } from "../domain/types/agent-scope.types";
import type { ParcoursPrevention } from "@/shared/database/schema/parcours-prevention";

// Mocks des repositories utilisés par calculateAgentScope
vi.mock("@/shared/database", () => ({
  agentPermissionsRepository: {
    getDepartementsByAgentId: vi.fn(),
  },
  allersVersRepository: {
    getDepartementsByAllersVersId: vi.fn(),
    getEpcisByAllersVersId: vi.fn(),
  },
  entreprisesAmoRepo: {
    getDepartementsByEntrepriseAmoId: vi.fn(),
    getEpcisByEntrepriseAmoId: vi.fn(),
  },
}));

// Mock du repository parcours (findById) tout en conservant le vrai
// `matchesTerritoire` exporté par le même module.
vi.mock("@/shared/database/repositories/parcours-prevention.repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/database/repositories/parcours-prevention.repository")>();
  return {
    ...actual,
    parcoursPreventionRepository: {
      ...actual.parcoursPreventionRepository,
      findById: vi.fn(),
    },
  };
});

import { agentPermissionsRepository, allersVersRepository, entreprisesAmoRepo } from "@/shared/database";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import {
  calculateAgentScope,
  canAccessDossier,
  canViewStatsForTerritory,
  getScopeFilterConditions,
  isAmoConfigured,
  verifyProspectTerritoryAccess,
} from "./agent-scope.service";

describe("agent-scope.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateAgentScope", () => {
    describe("SUPER_ADMINISTRATEUR", () => {
      it("devrait avoir un accès national complet", async () => {
        const agent: AgentScopeInput = {
          id: "agent-1",
          role: UserRole.SUPER_ADMINISTRATEUR,
          entrepriseAmoId: null,
        };

        const scope = await calculateAgentScope(agent);

        expect(scope.isNational).toBe(true);
        expect(scope.canViewAllDossiers).toBe(true);
        expect(scope.canViewDossiersByEntreprise).toBe(true);
        expect(scope.canViewDossiersWithoutAmo).toBe(true);
        expect(scope.entrepriseAmoIds).toEqual([]);
        expect(scope.departements).toEqual([]);
      });
    });

    describe("ADMINISTRATEUR", () => {
      it("devrait avoir un accès national complet", async () => {
        const agent: AgentScopeInput = {
          id: "agent-2",
          role: UserRole.ADMINISTRATEUR,
          entrepriseAmoId: null,
        };

        const scope = await calculateAgentScope(agent);

        expect(scope.isNational).toBe(true);
        expect(scope.canViewAllDossiers).toBe(true);
        expect(scope.canViewDossiersByEntreprise).toBe(true);
        expect(scope.canViewDossiersWithoutAmo).toBe(true);
      });
    });

    describe("AMO", () => {
      it("devrait peupler ses départements et EPCI depuis son entreprise", async () => {
        vi.mocked(entreprisesAmoRepo.getDepartementsByEntrepriseAmoId).mockResolvedValue(["36", "91"]);
        vi.mocked(entreprisesAmoRepo.getEpcisByEntrepriseAmoId).mockResolvedValue(["247400690"]);

        const agent: AgentScopeInput = {
          id: "agent-3",
          role: UserRole.AMO,
          entrepriseAmoId: "entreprise-123",
        };

        const scope = await calculateAgentScope(agent);

        expect(scope.isNational).toBe(false);
        expect(scope.canViewAllDossiers).toBe(false);
        expect(scope.canViewDossiersByEntreprise).toBe(true);
        expect(scope.canViewDossiersWithoutAmo).toBe(false);
        expect(scope.entrepriseAmoIds).toEqual(["entreprise-123"]);
        expect(scope.departements).toEqual(["36", "91"]);
        expect(scope.epcis).toEqual(["247400690"]);
      });

      it("devrait avoir un scope vide si pas d'entreprise rattachée", async () => {
        const agent: AgentScopeInput = {
          id: "agent-4",
          role: UserRole.AMO,
          entrepriseAmoId: null,
        };

        const scope = await calculateAgentScope(agent);

        expect(scope.isNational).toBe(false);
        expect(scope.canViewDossiersByEntreprise).toBe(true);
        expect(scope.entrepriseAmoIds).toEqual([]);
        expect(scope.departements).toEqual([]);
        expect(scope.epcis).toEqual([]);
      });
    });

    describe("AMO_ET_ALLERS_VERS", () => {
      it("devrait agréger les territoires AV et AMO sans doublons", async () => {
        vi.mocked(allersVersRepository.getDepartementsByAllersVersId).mockResolvedValue(["36"]);
        vi.mocked(allersVersRepository.getEpcisByAllersVersId).mockResolvedValue(["EPCI_AV"]);
        vi.mocked(entreprisesAmoRepo.getDepartementsByEntrepriseAmoId).mockResolvedValue(["36", "91"]);
        vi.mocked(entreprisesAmoRepo.getEpcisByEntrepriseAmoId).mockResolvedValue(["EPCI_AMO"]);

        const agent: AgentScopeInput = {
          id: "agent-hybride",
          role: UserRole.AMO_ET_ALLERS_VERS,
          entrepriseAmoId: "entreprise-123",
          allersVersId: "av-456",
        };

        const scope = await calculateAgentScope(agent);

        expect(scope.entrepriseAmoIds).toEqual(["entreprise-123"]);
        expect(scope.departements.sort()).toEqual(["36", "91"]);
        expect(scope.epcis.sort()).toEqual(["EPCI_AMO", "EPCI_AV"]);
        expect(scope.canViewDossiersByEntreprise).toBe(true);
        expect(scope.canViewDossiersWithoutAmo).toBe(true);
      });

      it("devrait lever une erreur si entrepriseAmoId ou allersVersId manquant", async () => {
        await expect(
          calculateAgentScope({
            id: "agent-hybride-incomplet",
            role: UserRole.AMO_ET_ALLERS_VERS,
            entrepriseAmoId: null,
            allersVersId: "av-456",
          })
        ).rejects.toThrow();
      });
    });

    describe("ANALYSTE", () => {
      it("devrait avoir accès national si pas de départements assignés", async () => {
        vi.mocked(agentPermissionsRepository.getDepartementsByAgentId).mockResolvedValue([]);

        const agent: AgentScopeInput = {
          id: "agent-5",
          role: UserRole.ANALYSTE,
          entrepriseAmoId: null,
        };

        const scope = await calculateAgentScope(agent);

        expect(scope.isNational).toBe(true);
        expect(scope.canViewAllDossiers).toBe(false);
        expect(scope.canViewDossiersByEntreprise).toBe(false);
        expect(scope.departements).toEqual([]);
      });

      it("devrait avoir accès limité aux départements assignés", async () => {
        vi.mocked(agentPermissionsRepository.getDepartementsByAgentId).mockResolvedValue(["75", "92", "93"]);

        const agent: AgentScopeInput = {
          id: "agent-6",
          role: UserRole.ANALYSTE,
          entrepriseAmoId: null,
        };

        const scope = await calculateAgentScope(agent);

        expect(scope.isNational).toBe(false);
        expect(scope.canViewAllDossiers).toBe(false);
        expect(scope.departements).toEqual(["75", "92", "93"]);
      });
    });

    describe("Rôle inconnu", () => {
      it("devrait retourner un scope sans accès", async () => {
        const agent: AgentScopeInput = {
          id: "agent-7",
          role: "ROLE_INCONNU",
          entrepriseAmoId: null,
        };

        const scope = await calculateAgentScope(agent);

        expect(scope.isNational).toBe(false);
        expect(scope.canViewAllDossiers).toBe(false);
        expect(scope.canViewDossiersByEntreprise).toBe(false);
        expect(scope.canViewDossiersWithoutAmo).toBe(false);
      });
    });
  });

  describe("canAccessDossier", () => {
    describe("Accès national (admin)", () => {
      const adminScope: AgentScope = {
        isNational: true,
        entrepriseAmoIds: [],
        departements: [],
        epcis: [],
        canViewAllDossiers: true,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: true,
      };

      it("devrait autoriser l'accès à tout dossier", () => {
        const result = canAccessDossier(adminScope, {
          entrepriseAmoId: "any-entreprise",
          departementCode: "75",
        });

        expect(result.hasAccess).toBe(true);
      });

      it("devrait autoriser l'accès aux dossiers sans AMO", () => {
        const result = canAccessDossier(adminScope, {
          entrepriseAmoId: null,
        });

        expect(result.hasAccess).toBe(true);
      });
    });

    describe("Accès AMO", () => {
      const amoScope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: ["entreprise-123"],
        departements: [],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: false,
      };

      it("devrait autoriser l'accès aux dossiers de son entreprise", () => {
        const result = canAccessDossier(amoScope, {
          entrepriseAmoId: "entreprise-123",
        });

        expect(result.hasAccess).toBe(true);
      });

      it("devrait refuser l'accès aux dossiers d'une autre entreprise", () => {
        const result = canAccessDossier(amoScope, {
          entrepriseAmoId: "autre-entreprise",
        });

        expect(result.hasAccess).toBe(false);
        expect(result.reason).toContain("autre entreprise AMO");
      });

      it("devrait refuser l'accès aux dossiers sans AMO", () => {
        const result = canAccessDossier(amoScope, {
          entrepriseAmoId: null,
        });

        expect(result.hasAccess).toBe(false);
        expect(result.reason).toContain("pas encore sélectionné d'AMO");
      });
    });

    describe("Accès allers-vers (futur)", () => {
      const allersVersScope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: [],
        departements: ["75", "92"],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: true,
      };

      it("devrait autoriser l'accès aux dossiers sans AMO dans son département", () => {
        const result = canAccessDossier(allersVersScope, {
          entrepriseAmoId: null,
          departementCode: "75",
        });

        expect(result.hasAccess).toBe(true);
      });

      it("devrait refuser l'accès aux dossiers sans AMO hors de son territoire", () => {
        const result = canAccessDossier(allersVersScope, {
          entrepriseAmoId: null,
          departementCode: "33",
        });

        expect(result.hasAccess).toBe(false);
        expect(result.reason).toContain("hors de votre territoire");
      });
    });

    describe("Aucun accès (analyste)", () => {
      const analysteScope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: [],
        departements: [],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: false,
      };

      it("devrait refuser l'accès à tout dossier", () => {
        const result = canAccessDossier(analysteScope, {
          entrepriseAmoId: "entreprise-123",
        });

        expect(result.hasAccess).toBe(false);
        expect(result.reason).toContain("Accès non autorisé");
      });
    });
  });

  describe("canViewStatsForTerritory", () => {
    it("devrait autoriser les stats nationales pour un scope national", () => {
      const scope: AgentScope = {
        isNational: true,
        entrepriseAmoIds: [],
        departements: [],
        epcis: [],
        canViewAllDossiers: true,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: true,
      };

      expect(canViewStatsForTerritory(scope)).toBe(true);
      expect(canViewStatsForTerritory(scope, "75")).toBe(true);
      expect(canViewStatsForTerritory(scope, "33")).toBe(true);
    });

    it("devrait autoriser les stats d'un département assigné", () => {
      const scope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: [],
        departements: ["75", "92"],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: false,
      };

      expect(canViewStatsForTerritory(scope, "75")).toBe(true);
      expect(canViewStatsForTerritory(scope, "92")).toBe(true);
    });

    it("devrait refuser les stats d'un département non assigné", () => {
      const scope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: [],
        departements: ["75"],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: false,
      };

      expect(canViewStatsForTerritory(scope, "33")).toBe(false);
    });

    it("devrait autoriser les stats globales pour analyste sans restriction", () => {
      const scope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: [],
        departements: [], // Pas de restriction = accès global
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: false,
      };

      expect(canViewStatsForTerritory(scope)).toBe(true);
    });
  });

  describe("getScopeFilterConditions", () => {
    it("devrait retourner null pour un accès national", () => {
      const scope: AgentScope = {
        isNational: true,
        entrepriseAmoIds: [],
        departements: [],
        epcis: [],
        canViewAllDossiers: true,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: true,
      };

      const filters = getScopeFilterConditions(scope);

      expect(filters).toBeNull();
    });

    it("devrait retourner les IDs entreprise pour un AMO", () => {
      const scope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: ["entreprise-123", "entreprise-456"],
        departements: [],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: false,
      };

      const filters = getScopeFilterConditions(scope);

      expect(filters).not.toBeNull();
      expect(filters?.entrepriseAmoIds).toEqual(["entreprise-123", "entreprise-456"]);
    });

    it("devrait retourner les départements pour les allers-vers", () => {
      const scope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: [],
        departements: ["75"],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: true,
      };

      const filters = getScopeFilterConditions(scope);

      expect(filters).not.toBeNull();
      expect(filters?.departements).toEqual(["75"]);
    });

    it("devrait retourner un filtre vide pour analyste (pas d'accès aux dossiers)", () => {
      const scope: AgentScope = {
        isNational: false,
        entrepriseAmoIds: [],
        departements: [],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: false,
      };

      const filters = getScopeFilterConditions(scope);

      expect(filters).not.toBeNull();
      expect(filters?.entrepriseAmoIds).toEqual([]);
    });
  });

  describe("isAmoConfigured", () => {
    it("devrait retourner true pour un AMO avec entreprise", () => {
      const agent: AgentScopeInput = {
        id: "agent-1",
        role: UserRole.AMO,
        entrepriseAmoId: "entreprise-123",
      };

      expect(isAmoConfigured(agent)).toBe(true);
    });

    it("devrait retourner false pour un AMO sans entreprise", () => {
      const agent: AgentScopeInput = {
        id: "agent-2",
        role: UserRole.AMO,
        entrepriseAmoId: null,
      };

      expect(isAmoConfigured(agent)).toBe(false);
    });

    it("devrait retourner true pour les autres rôles (non applicable)", () => {
      const adminAgent: AgentScopeInput = {
        id: "agent-3",
        role: UserRole.ADMINISTRATEUR,
        entrepriseAmoId: null,
      };

      const analysteAgent: AgentScopeInput = {
        id: "agent-4",
        role: UserRole.ANALYSTE,
        entrepriseAmoId: null,
      };

      expect(isAmoConfigured(adminAgent)).toBe(true);
      expect(isAmoConfigured(analysteAgent)).toBe(true);
    });
  });

  describe("verifyProspectTerritoryAccess", () => {
    // Parcours minimal pour `findById` : seules les deux simulations comptent
    // pour la résolution territoriale (le reste est ignoré par le contrôle).
    function parcours(
      sims: Partial<Pick<ParcoursPrevention, "rgaSimulationData" | "rgaSimulationDataAgent">>
    ): ParcoursPrevention {
      return {
        rgaSimulationData: null,
        rgaSimulationDataAgent: null,
        ...sims,
      } as ParcoursPrevention;
    }

    function simAuDepartement(code: string) {
      return { logement: { code_departement: code } } as ParcoursPrevention["rgaSimulationData"];
    }

    it("autorise un super-admin (national) sans consulter le parcours", async () => {
      const error = await verifyProspectTerritoryAccess("parcours-1", {
        id: "admin-1",
        role: UserRole.SUPER_ADMINISTRATEUR,
        entrepriseAmoId: null,
        allersVersId: null,
      });

      expect(error).toBeNull();
      // Court-circuit national : pas de lecture du parcours.
      expect(parcoursPreventionRepository.findById).not.toHaveBeenCalled();
    });

    it("autorise l'accès quand la simulation DEMANDEUR matche, même si la simulation AGENT diverge (régression bug d'accès)", async () => {
      // Scope AMO_ET_ALLERS_VERS sur le département 32.
      vi.mocked(allersVersRepository.getDepartementsByAllersVersId).mockResolvedValue(["32"]);
      vi.mocked(allersVersRepository.getEpcisByAllersVersId).mockResolvedValue([]);
      vi.mocked(entreprisesAmoRepo.getDepartementsByEntrepriseAmoId).mockResolvedValue(["32"]);
      vi.mocked(entreprisesAmoRepo.getEpcisByEntrepriseAmoId).mockResolvedValue([]);

      // Demandeur dans le 32 (présent en liste), simulation agent dans le 31.
      vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(
        parcours({
          rgaSimulationData: simAuDepartement("32"),
          rgaSimulationDataAgent: simAuDepartement("31"),
        })
      );

      const error = await verifyProspectTerritoryAccess("parcours-1", {
        id: "agent-hybride",
        role: UserRole.AMO_ET_ALLERS_VERS,
        entrepriseAmoId: "entreprise-123",
        allersVersId: "av-456",
      });

      // user-first → 32 → accès autorisé (avant le fix : agent-first → 31 → 404).
      expect(error).toBeNull();
    });

    it("refuse l'accès quand le prospect est hors territoire", async () => {
      vi.mocked(allersVersRepository.getDepartementsByAllersVersId).mockResolvedValue(["32"]);
      vi.mocked(allersVersRepository.getEpcisByAllersVersId).mockResolvedValue([]);
      vi.mocked(entreprisesAmoRepo.getDepartementsByEntrepriseAmoId).mockResolvedValue(["32"]);
      vi.mocked(entreprisesAmoRepo.getEpcisByEntrepriseAmoId).mockResolvedValue([]);

      vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(
        parcours({ rgaSimulationData: simAuDepartement("33") })
      );

      const error = await verifyProspectTerritoryAccess("parcours-1", {
        id: "agent-hybride",
        role: UserRole.AMO_ET_ALLERS_VERS,
        entrepriseAmoId: "entreprise-123",
        allersVersId: "av-456",
      });

      expect(error).toBe("Ce prospect n'est pas dans votre territoire");
    });

    it("retourne une erreur si le parcours est introuvable", async () => {
      vi.mocked(allersVersRepository.getDepartementsByAllersVersId).mockResolvedValue(["32"]);
      vi.mocked(allersVersRepository.getEpcisByAllersVersId).mockResolvedValue([]);
      vi.mocked(entreprisesAmoRepo.getDepartementsByEntrepriseAmoId).mockResolvedValue(["32"]);
      vi.mocked(entreprisesAmoRepo.getEpcisByEntrepriseAmoId).mockResolvedValue([]);

      vi.mocked(parcoursPreventionRepository.findById).mockResolvedValue(null);

      const error = await verifyProspectTerritoryAccess("parcours-inexistant", {
        id: "agent-hybride",
        role: UserRole.AMO_ET_ALLERS_VERS,
        entrepriseAmoId: "entreprise-123",
        allersVersId: "av-456",
      });

      expect(error).toBe("Parcours non trouvé");
    });
  });
});
