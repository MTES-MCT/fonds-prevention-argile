import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { AgentAvecRole } from "@/shared/database/schema/agents";

vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({ calculateAgentScope: vi.fn() }));
vi.mock("@/shared/database/repositories/experts.repository", () => ({
  expertsRepository: { findActifsDuDepartement: vi.fn() },
}));

import { chargerAnnuaireExperts, expertsDuDepartementDuDossier } from "./annuaire-experts.service";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";

function agent(role: UserRole): AgentAvecRole {
  return {
    id: "agent-1",
    role,
    entrepriseAmoId: role === UserRole.AMO ? "amo-1" : null,
    allersVersId: null,
  } as AgentAvecRole;
}

function territoire(departements: string[]) {
  vi.mocked(calculateAgentScope).mockResolvedValue({
    isNational: false,
    entrepriseAmoIds: [],
    departements,
    epcis: [],
    canViewAllDossiers: false,
    canViewDossiersByEntreprise: false,
    canViewDossiersWithoutAmo: false,
  });
}

const EXPERT_INDRE = {
  id: "e-1",
  nom: "Géotech",
  siret: "39248872200027",
  dateValidationDhup: null,
  contactInterneNom: "Camille Interne",
  contactInterneEmail: "interne@exemple.fr",
  contactInterneTelephone: "0600000000",
  desactiveAt: null,
  desactiveParNom: null,
  desactiveRaison: null,
  departements: [{ codeDepartement: "36", email: "indre@exemple.fr", telephone: null }],
};

describe("chargerAnnuaireExperts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(expertsRepository.findActifsDuDepartement).mockResolvedValue([EXPERT_INDRE]);
  });

  it("ouvre l'annuaire d'un agent AMO sur son territoire, sans contact interne", async () => {
    territoire(["36"]);

    const annuaire = await chargerAnnuaireExperts(agent(UserRole.AMO), undefined);

    expect(annuaire.departement).toEqual({ code: "36", nom: "Indre" });
    expect(annuaire.experts.map((e) => e.nom)).toEqual(["Géotech"]);
    expect(JSON.stringify(annuaire)).not.toContain("interne@exemple.fr");
  });

  it("laisse un agent AMO consulter un autre département", async () => {
    territoire(["36"]);
    await chargerAnnuaireExperts(agent(UserRole.AMO), "63");
    expect(expertsRepository.findActifsDuDepartement).toHaveBeenCalledWith("63");
  });

  it("ne sort pas un analyste de son territoire, même s'il en demande un autre", async () => {
    territoire(["36"]);

    const annuaire = await chargerAnnuaireExperts(agent(UserRole.ANALYSTE), "63");

    expect(expertsRepository.findActifsDuDepartement).toHaveBeenCalledWith("36");
    expect(expertsRepository.findActifsDuDepartement).not.toHaveBeenCalledWith("63");
    expect(annuaire.departementsConsultables.map((d) => d.code)).toEqual(["36"]);
  });

  it("ne donne rien à un analyste sans département", async () => {
    territoire([]);

    const annuaire = await chargerAnnuaireExperts(agent(UserRole.ANALYSTE), "36");

    expect(annuaire).toEqual({
      departement: null,
      departementsConsultables: [],
      departementsDuTerritoire: [],
      experts: [],
    });
    expect(expertsRepository.findActifsDuDepartement).not.toHaveBeenCalled();
  });
});

describe("expertsDuDepartementDuDossier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(expertsRepository.findActifsDuDepartement).mockResolvedValue([EXPERT_INDRE]);
  });

  it("lit un département stocké en nombre, comme les simulations de 2025", async () => {
    territoire(["36"]);
    const encart = await expertsDuDepartementDuDossier(agent(UserRole.AMO), "3");
    expect(expertsRepository.findActifsDuDepartement).toHaveBeenCalledWith("03");
    expect(encart?.code).toBe("03");
  });

  it("n'affiche rien à un analyste pour un département hors de son territoire", async () => {
    territoire(["36"]);
    expect(await expertsDuDepartementDuDossier(agent(UserRole.ANALYSTE), "63")).toBeNull();
    expect(expertsRepository.findActifsDuDepartement).not.toHaveBeenCalled();
  });

  it("n'affiche rien sans département connu", async () => {
    territoire(["36"]);
    expect(await expertsDuDepartementDuDossier(agent(UserRole.AMO), null)).toBeNull();
  });
});
