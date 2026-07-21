import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParcoursPreventionRepository, matchesTerritoire } from "./parcours-prevention.repository";
import { Step, Status } from "@/features/parcours/core";
import type { RGASimulationData } from "@/shared/domain/types";
import type { ParcoursPrevention } from "../schema/parcours-prevention";

// Mock minimal du client db : `db.select()...limit(n)` retourne `[]` par défaut
// (aucune validation AMO existante, donc validateInvitation suit la branche
// standard vers CHOIX_AMO/TODO). Les méthodes du repo testées directement sont
// stubbées via `vi.spyOn`, donc ce mock n'a pas besoin de gérer le query builder
// complet.
const dbSelectChain = {
  from: vi.fn(() => dbSelectChain),
  where: vi.fn(() => dbSelectChain),
  limit: vi.fn(async () => [] as unknown[]),
};
vi.mock("../client", () => ({
  db: {
    select: vi.fn(() => dbSelectChain),
  },
}));

function makeRgaData(overrides: Partial<RGASimulationData["logement"]> = {}): RGASimulationData {
  return {
    logement: {
      adresse: "1 rue de la Paix",
      code_region: "24",
      code_departement: "33",
      epci: "200000",
      commune: "33063",
      commune_nom: "Bordeaux",
      coordonnees: "44.8378,-0.5792",
      clef_ban: "33063_xxxx",
      commune_denormandie: false,
      annee_de_construction: "1990",
      rnb: "",
      niveaux: 1,
      zone_dexposition: "moyen",
      type: "maison",
      mitoyen: false,
      proprietaire_occupant: true,
      ...overrides,
    },
    taxeFonciere: { commune_eligible: true },
    rga: {
      assure: true,
      indemnise_indemnise_rga: false,
      sinistres: "endommagée",
    },
    menage: { revenu_rga: 30000, personnes: 2 },
    vous: {},
    simulatedAt: new Date().toISOString(),
  };
}

describe("matchesTerritoire", () => {
  describe("sans filtre territorial (aucun département ni EPCI)", () => {
    it("inclut un parcours avec données de localisation", () => {
      const data = makeRgaData({ code_departement: "33", epci: "200000" });
      expect(matchesTerritoire(data, [], [])).toBe(true);
    });

    it("inclut un parcours sans rgaSimulationData", () => {
      expect(matchesTerritoire(null, [], [])).toBe(true);
    });
  });

  describe("filtrage par département uniquement (pas d'EPCI dans le scope)", () => {
    it("inclut un prospect du département couvert", () => {
      const data = makeRgaData({ code_departement: "33" });
      expect(matchesTerritoire(data, ["33"], [])).toBe(true);
    });

    it("exclut un prospect d'un autre département", () => {
      const data = makeRgaData({ code_departement: "75" });
      expect(matchesTerritoire(data, ["33"], [])).toBe(false);
    });

    it("fonctionne avec plusieurs départements", () => {
      const data = makeRgaData({ code_departement: "44" });
      expect(matchesTerritoire(data, ["33", "44", "17"], [])).toBe(true);
    });

    it("exclut un parcours sans rgaSimulationData", () => {
      expect(matchesTerritoire(null, ["33"], [])).toBe(false);
    });
  });

  describe("union EPCI ∪ département (scope élargi)", () => {
    it("inclut si le département match (même si l'EPCI ne correspond pas)", () => {
      // Union : dept couvert suffit, l'EPCI hors-scope n'exclut pas.
      const data = makeRgaData({ code_departement: "33", epci: "999999" });
      expect(matchesTerritoire(data, ["33"], ["200001"])).toBe(true);
    });

    it("inclut si l'EPCI match (même si le département n'est pas couvert)", () => {
      const data = makeRgaData({ code_departement: "75", epci: "200001" });
      expect(matchesTerritoire(data, ["33"], ["200001"])).toBe(true);
    });

    it("exclut si ni le département ni l'EPCI ne sont dans le scope", () => {
      const data = makeRgaData({ code_departement: "75", epci: "200002" });
      expect(matchesTerritoire(data, ["33"], ["200001"])).toBe(false);
    });

    it("fonctionne avec plusieurs EPCIs", () => {
      const data = makeRgaData({ code_departement: "75", epci: "200003" });
      expect(matchesTerritoire(data, [], ["200001", "200002", "200003"])).toBe(true);
    });

    it("exclut un parcours sans rgaSimulationData", () => {
      expect(matchesTerritoire(null, ["33"], ["200001"])).toBe(false);
    });
  });

  describe("filtrage par EPCI seul (sans département)", () => {
    it("inclut un prospect dont l'EPCI correspond", () => {
      const data = makeRgaData({ epci: "200001" });
      expect(matchesTerritoire(data, [], ["200001"])).toBe(true);
    });

    it("exclut un prospect dont l'EPCI ne correspond pas", () => {
      const data = makeRgaData({ epci: "200002" });
      expect(matchesTerritoire(data, [], ["200001"])).toBe(false);
    });
  });
});

describe("ParcoursPreventionRepository — invitation", () => {
  let repo: ParcoursPreventionRepository;

  const baseParcours: ParcoursPrevention = {
    id: "parcours-1",
    userId: "user-1",
    currentStep: Step.INVITATION,
    currentStatus: Status.TODO,
    situationParticulier: "prospect" as never,
    rgaSimulationData: null,
    rgaSimulationCompletedAt: null,
    rgaDataDeletedAt: null,
    rgaDataDeletionReason: null,
    rgaSimulationDataAgent: null,
    rgaSimulationDataAgentBaseline: null,
    rgaSimulationAgentEditedAt: null,
    rgaSimulationAgentEditedBy: null,
    archivedAt: null,
    archiveReason: null,
    archivedBy: null,
    createdByAgentId: "agent-1",
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    repo = new ParcoursPreventionRepository();
  });

  describe("findOrCreateForUser", () => {
    it("démarre à INVITATION quand createdByAgentId est fourni", async () => {
      vi.spyOn(repo, "findByUserId").mockResolvedValue(null);
      const create = vi.spyOn(repo, "create").mockResolvedValue(baseParcours);

      await repo.findOrCreateForUser("user-1", { createdByAgentId: "agent-1" });

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: Step.INVITATION, createdByAgentId: "agent-1" })
      );
    });

    it("démarre à CHOIX_AMO sans createdByAgentId", async () => {
      vi.spyOn(repo, "findByUserId").mockResolvedValue(null);
      const create = vi
        .spyOn(repo, "create")
        .mockResolvedValue({ ...baseParcours, currentStep: Step.CHOIX_AMO, createdByAgentId: null });

      await repo.findOrCreateForUser("user-1");

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: Step.CHOIX_AMO, createdByAgentId: null })
      );
    });
  });

  describe("validateInvitation", () => {
    it("passe le parcours de INVITATION à CHOIX_AMO/TODO", async () => {
      vi.spyOn(repo, "findById").mockResolvedValue(baseParcours);
      const updateStep = vi
        .spyOn(repo, "updateStep")
        .mockResolvedValue({ ...baseParcours, currentStep: Step.CHOIX_AMO });

      await repo.validateInvitation("parcours-1");

      expect(updateStep).toHaveBeenCalledWith("parcours-1", Step.CHOIX_AMO, Status.TODO);
    });

    it("ne fait rien si le parcours n'est plus à l'étape INVITATION", async () => {
      vi.spyOn(repo, "findById").mockResolvedValue({ ...baseParcours, currentStep: Step.CHOIX_AMO });
      const updateStep = vi.spyOn(repo, "updateStep");

      await repo.validateInvitation("parcours-1");

      expect(updateStep).not.toHaveBeenCalled();
    });

    it("retourne null si le parcours n'existe pas", async () => {
      vi.spyOn(repo, "findById").mockResolvedValue(null);
      const result = await repo.validateInvitation("missing");
      expect(result).toBeNull();
    });

    it("saute CHOIX_AMO si une validation AMO LOGEMENT_ELIGIBLE existe déjà", async () => {
      vi.spyOn(repo, "findById").mockResolvedValue(baseParcours);
      // Mock : retourne une validation AMO en LOGEMENT_ELIGIBLE
      dbSelectChain.limit.mockResolvedValueOnce([{ statut: "logement_eligible" }]);
      const updateStep = vi
        .spyOn(repo, "updateStep")
        .mockResolvedValue({ ...baseParcours, currentStep: Step.ELIGIBILITE });

      await repo.validateInvitation("parcours-1");

      expect(updateStep).toHaveBeenCalledWith("parcours-1", Step.ELIGIBILITE, Status.TODO);
    });
  });
});
