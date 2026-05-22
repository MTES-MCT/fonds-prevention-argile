import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { AgentScope } from "../../../../auth/permissions/domain/types/agent-scope.types";

const { getParcoursByTerritoire, calculateAgentScope, resolveResponsables, getActorContext, canActAsResponsable } =
  vi.hoisted(() => ({
    getParcoursByTerritoire: vi.fn(),
    calculateAgentScope: vi.fn(),
    resolveResponsables: vi.fn(),
    getActorContext: vi.fn(),
    canActAsResponsable: vi.fn(),
  }));

vi.mock("@/shared/database", () => ({
  parcoursRepo: { getParcoursByTerritoire },
}));

vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  calculateAgentScope,
}));

vi.mock("@/features/auth/permissions/services/responsable-permissions.service", () => ({
  getActorContext,
  canActAsResponsable,
}));

vi.mock("./responsable-resolver.service", () => ({
  resolveResponsables,
}));

import { getDossiersByAgent } from "./dossiers-territoire.service";

function makeScope(overrides: Partial<AgentScope> = {}): AgentScope {
  return {
    isNational: false,
    entrepriseAmoIds: [],
    departements: [],
    epcis: [],
    canViewAllDossiers: false,
    canViewDossiersByEntreprise: false,
    canViewDossiersWithoutAmo: false,
    ...overrides,
  };
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    parcoursId: "p1",
    userId: "u1",
    situationParticulier: SituationParticulier.PROSPECT,
    currentStep: Step.CHOIX_AMO,
    currentStatus: Status.TODO,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-02-01"),
    archivedAt: null,
    createdByAgentId: null,
    rgaSimulationData: {
      logement: { commune_nom: "Châteauroux", code_departement: "36", epci: "200001" },
    },
    rgaSimulationDataAgent: null,
    userPrenom: "Alice",
    userNom: "Martin",
    userEmail: "alice@test.fr",
    userTelephone: "0102030405",
    validationId: null,
    validationStatut: null,
    entrepriseAmoId: null,
    validationChoisieAt: null,
    validationValideeAt: null,
    dsStatus: null,
    ...overrides,
  };
}

describe("getDossiersByAgent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveResponsables.mockImplementation(async (items: Array<{ parcoursId: string }>) => {
      const map = new Map();
      for (const item of items) {
        map.set(item.parcoursId, { type: "ARCHIVE" });
      }
      return map;
    });
    getActorContext.mockResolvedValue({
      entrepriseAmoId: null,
      allersVersId: null,
      allersVersDepartements: [],
    });
    canActAsResponsable.mockReturnValue(false);
  });

  it("interroge le repo avec les territoires du scope (AMO)", async () => {
    calculateAgentScope.mockResolvedValue(
      makeScope({
        entrepriseAmoIds: ["amo-1"],
        departements: ["36"],
        epcis: ["EPCI_36"],
        canViewDossiersByEntreprise: true,
      })
    );
    getParcoursByTerritoire.mockResolvedValue([makeRow()]);

    const result = await getDossiersByAgent({
      id: "agent-amo",
      role: UserRole.AMO,
      entrepriseAmoId: "amo-1",
    });

    expect(getParcoursByTerritoire).toHaveBeenCalledWith(["36"], ["EPCI_36"], undefined);
    expect(result.total).toBe(1);
    expect(result.territoiresCouverts).toEqual({ departements: ["36"], epcis: ["EPCI_36"] });
  });

  it("passe des territoires vides quand le scope est national (admin)", async () => {
    calculateAgentScope.mockResolvedValue(
      makeScope({ isNational: true, canViewAllDossiers: true, canViewDossiersByEntreprise: true })
    );
    getParcoursByTerritoire.mockResolvedValue([]);

    await getDossiersByAgent({
      id: "admin",
      role: UserRole.ADMINISTRATEUR,
      entrepriseAmoId: null,
    });

    expect(getParcoursByTerritoire).toHaveBeenCalledWith([], [], undefined);
  });

  it("retourne un résultat vide pour un scope sans aucun droit (analyste sans dept)", async () => {
    calculateAgentScope.mockResolvedValue(makeScope());

    const result = await getDossiersByAgent({
      id: "ana",
      role: UserRole.ANALYSTE,
      entrepriseAmoId: null,
    });

    expect(result.dossiers).toEqual([]);
    expect(result.total).toBe(0);
    expect(getParcoursByTerritoire).not.toHaveBeenCalled();
  });

  it("mappe correctement un dossier sans validation AMO (prospect)", async () => {
    calculateAgentScope.mockResolvedValue(makeScope({ departements: ["36"], canViewDossiersWithoutAmo: true }));
    getParcoursByTerritoire.mockResolvedValue([makeRow()]);

    const result = await getDossiersByAgent({
      id: "av",
      role: UserRole.ALLERS_VERS,
      entrepriseAmoId: null,
      allersVersId: "av-1",
    });

    expect(result.dossiers[0].validation).toBeNull();
    expect(result.dossiers[0].logement.commune).toBe("Châteauroux");
    expect(result.dossiers[0].logement.codeDepartement).toBe("36");
  });

  it("mappe correctement un dossier avec validation AMO", async () => {
    calculateAgentScope.mockResolvedValue(makeScope({ departements: ["36"], canViewDossiersByEntreprise: true }));
    getParcoursByTerritoire.mockResolvedValue([
      makeRow({
        validationId: "v1",
        validationStatut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
        entrepriseAmoId: "amo-1",
        validationChoisieAt: new Date("2026-01-10"),
        validationValideeAt: new Date("2026-01-15"),
      }),
    ]);

    const result = await getDossiersByAgent({
      id: "agent",
      role: UserRole.AMO,
      entrepriseAmoId: "amo-1",
    });

    expect(result.dossiers[0].validation).toMatchObject({
      statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
      entrepriseAmoId: "amo-1",
    });
  });
});
