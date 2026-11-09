import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { AgentAvecRole } from "@/shared/database/schema/agents";

vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({ calculateAgentScope: vi.fn() }));
vi.mock("@/shared/database/repositories/experts.repository", () => ({
  expertsRepository: { findActifs: vi.fn(), findActifsDuDepartement: vi.fn() },
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

const EXPERT_ALLIER = {
  ...EXPERT_INDRE,
  id: "e-2",
  nom: "Alpha Sols",
  departements: [
    { codeDepartement: "03", email: "allier@exemple.fr", telephone: null },
    { codeDepartement: "36", email: "alpha-indre@exemple.fr", telephone: null },
  ],
};

const sections = (annuaire: Awaited<ReturnType<typeof chargerAnnuaireExperts>>) =>
  annuaire.sections.map((section) => [section.code, section.experts.map((expert) => expert.nom)]);

describe("chargerAnnuaireExperts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(expertsRepository.findActifs).mockResolvedValue([EXPERT_INDRE, EXPERT_ALLIER]);
  });

  it("montre au super-administrateur tous les départements qui ont un expert, regroupés", async () => {
    territoire([]);

    const annuaire = await chargerAnnuaireExperts(agent(UserRole.SUPER_ADMINISTRATEUR), undefined);

    expect(annuaire.vue).toEqual({ type: "tous" });
    // Un expert de deux départements figure dans chacun, avec le contact de celui-ci.
    expect(sections(annuaire)).toEqual([
      ["03", ["Alpha Sols"]],
      ["36", ["Alpha Sols", "Géotech"]],
    ]);
    expect(annuaire.sections[1].experts[0].departements).toEqual([
      { code: "36", nom: "Indre", email: "alpha-indre@exemple.fr", telephone: null },
    ]);
    expect(annuaire.departementsConsultables.find((d) => d.code === "75")).toEqual({
      code: "75",
      nom: "Paris",
      aDesExperts: false,
    });
  });

  it("ouvre l'annuaire d'un agent AMO sur son territoire, sans contact interne", async () => {
    territoire(["36"]);

    const annuaire = await chargerAnnuaireExperts(agent(UserRole.AMO), undefined);

    expect(annuaire.vue).toEqual({ type: "departement", code: "36" });
    expect(sections(annuaire)).toEqual([["36", ["Alpha Sols", "Géotech"]]]);
    expect(JSON.stringify(annuaire)).not.toContain("interne@exemple.fr");
  });

  it("laisse un agent AMO consulter un autre département, même sans expert", async () => {
    territoire(["36"]);
    const annuaire = await chargerAnnuaireExperts(agent(UserRole.AMO), "63");
    expect(sections(annuaire)).toEqual([["63", []]]);
  });

  it("ne sort pas un analyste de son territoire, même s'il en demande un autre ou tous", async () => {
    territoire(["36"]);

    const annuaire = await chargerAnnuaireExperts(agent(UserRole.ANALYSTE), "03");
    expect(sections(annuaire)).toEqual([["36", ["Alpha Sols", "Géotech"]]]);
    expect(annuaire.departementsConsultables.map((d) => d.code)).toEqual(["36"]);

    const tous = await chargerAnnuaireExperts(agent(UserRole.ANALYSTE), "tous");
    expect(tous.perimetre).toBe("territoire");
    expect(sections(tous).map(([code]) => code)).toEqual(["36"]);
  });

  it("ne donne rien à un analyste sans département", async () => {
    territoire([]);

    const annuaire = await chargerAnnuaireExperts(agent(UserRole.ANALYSTE), "36");

    expect(annuaire).toEqual({
      vue: null,
      perimetre: "aucun",
      sections: [],
      departementsConsultables: [],
      departementsDuTerritoire: [],
    });
    expect(expertsRepository.findActifs).not.toHaveBeenCalled();
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
