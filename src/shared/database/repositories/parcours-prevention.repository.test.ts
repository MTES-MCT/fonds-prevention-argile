import { describe, it, expect, vi, beforeEach } from "vitest";
import { ParcoursPreventionRepository, matchesTerritoire } from "./parcours-prevention.repository";
import { Step, Status } from "@/features/parcours/core";
import type { RGASimulationData } from "@/shared/domain/types";
import type { ParcoursPrevention } from "../schema/parcours-prevention";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

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
const dbInsertChain = {
  values: vi.fn(() => dbInsertChain),
  onConflictDoNothing: vi.fn(() => dbInsertChain),
  returning: vi.fn(async () => [] as unknown[]),
};
const dbUpdateChain = {
  set: vi.fn(() => dbUpdateChain),
  where: vi.fn(() => dbUpdateChain),
  returning: vi.fn(async () => [] as unknown[]),
};
vi.mock("../client", () => ({
  db: {
    select: vi.fn(() => dbSelectChain),
    insert: vi.fn(() => dbInsertChain),
    update: vi.fn(() => dbUpdateChain),
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

const BASE_PARCOURS: ParcoursPrevention = {
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
  vulnerabiliteSimulationId: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ParcoursPreventionRepository — invitation", () => {
  let repo: ParcoursPreventionRepository;
  const baseParcours = BASE_PARCOURS;

  beforeEach(() => {
    repo = new ParcoursPreventionRepository();
    dbInsertChain.values.mockClear();
    dbInsertChain.onConflictDoNothing.mockClear();
    dbInsertChain.returning.mockReset();
    dbInsertChain.returning.mockResolvedValue([] as unknown[]);
  });

  describe("findOrCreateForUser", () => {
    it("insère avec INVITATION quand createdByAgentId est fourni (created=true)", async () => {
      vi.spyOn(repo, "findByUserId").mockResolvedValue(null);
      dbInsertChain.returning.mockResolvedValueOnce([{ ...baseParcours, currentStep: Step.INVITATION }]);

      const { created } = await repo.findOrCreateForUser("user-1", { createdByAgentId: "agent-1" });

      expect(created).toBe(true);
      expect(dbInsertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: Step.INVITATION, createdByAgentId: "agent-1" })
      );
    });

    it("insère avec CHOIX_AMO sans createdByAgentId (created=true)", async () => {
      vi.spyOn(repo, "findByUserId").mockResolvedValue(null);
      dbInsertChain.returning.mockResolvedValueOnce([
        { ...baseParcours, currentStep: Step.CHOIX_AMO, createdByAgentId: null },
      ]);

      const { created } = await repo.findOrCreateForUser("user-1");

      expect(created).toBe(true);
      expect(dbInsertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ currentStep: Step.CHOIX_AMO, createdByAgentId: null })
      );
    });

    it("created=false et aucun insert si le parcours existe déjà", async () => {
      vi.spyOn(repo, "findByUserId").mockResolvedValue(baseParcours);

      const { parcours, created } = await repo.findOrCreateForUser("user-1");

      expect(created).toBe(false);
      expect(parcours).toBe(baseParcours);
      expect(dbInsertChain.values).not.toHaveBeenCalled();
    });

    it("created=false sur conflit concurrent (onConflictDoNothing → refetch)", async () => {
      const findByUserId = vi
        .spyOn(repo, "findByUserId")
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(baseParcours);
      dbInsertChain.returning.mockResolvedValueOnce([]);

      const { parcours, created } = await repo.findOrCreateForUser("user-1");

      expect(created).toBe(false);
      expect(parcours).toBe(baseParcours);
      expect(findByUserId).toHaveBeenCalledTimes(2);
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

describe("ParcoursPreventionRepository — advanceToEligibiliteFromChoixAmo", () => {
  let repo: ParcoursPreventionRepository;

  beforeEach(() => {
    repo = new ParcoursPreventionRepository();
    dbUpdateChain.set.mockClear();
    dbUpdateChain.where.mockClear();
    dbUpdateChain.returning.mockReset();
    dbUpdateChain.returning.mockResolvedValue([] as unknown[]);
  });

  it("ouvre l'étape éligibilité et signale que le parcours a bougé", async () => {
    dbUpdateChain.returning.mockResolvedValueOnce([{ id: "parcours-1" }]);

    await expect(repo.advanceToEligibiliteFromChoixAmo("parcours-1")).resolves.toBe(true);
    expect(dbUpdateChain.set).toHaveBeenCalledWith({ currentStep: Step.ELIGIBILITE, currentStatus: Status.TODO });
  });

  it("est un no-op quand le parcours n'est plus à CHOIX_AMO (aucune ligne touchée)", async () => {
    await expect(repo.advanceToEligibiliteFromChoixAmo("parcours-1")).resolves.toBe(false);
  });
});

// L'étape invitation tient jusqu'au claim : c'est elle qui conditionne la promotion de la
// simulation de l'agent. Le routage doit donc couvrir les cinq états de validation.
describe("validateInvitation — routage au claim selon la validation", () => {
  let repo: ParcoursPreventionRepository;
  const enInvitation: ParcoursPrevention = {
    ...BASE_PARCOURS,
    currentStep: Step.INVITATION,
  };

  beforeEach(() => {
    repo = new ParcoursPreventionRepository();
    dbSelectChain.limit.mockReset();
    dbSelectChain.limit.mockResolvedValue([]);
  });

  /** Prépare la validation lue par `validateInvitation` et espionne la transition. */
  function prepare(statut: StatutValidationAmo | null) {
    vi.spyOn(repo, "findById").mockResolvedValue(enInvitation);
    dbSelectChain.limit.mockResolvedValueOnce(statut === null ? [] : [{ statut }]);
    return vi.spyOn(repo, "updateStep").mockResolvedValue(enInvitation);
  }

  it("sans validation : route vers choix AMO / à faire", async () => {
    const updateStep = prepare(null);

    await repo.validateInvitation("parcours-1");

    expect(updateStep).toHaveBeenCalledWith("parcours-1", Step.CHOIX_AMO, Status.TODO);
  });

  it("validation en attente : route vers choix AMO / en instruction", async () => {
    const updateStep = prepare(StatutValidationAmo.EN_ATTENTE);

    await repo.validateInvitation("parcours-1");

    expect(updateStep).toHaveBeenCalledWith("parcours-1", Step.CHOIX_AMO, Status.EN_INSTRUCTION);
  });

  it("validation « sans AMO » : route vers éligibilité / à faire", async () => {
    const updateStep = prepare(StatutValidationAmo.SANS_AMO);

    await repo.validateInvitation("parcours-1");

    expect(updateStep).toHaveBeenCalledWith("parcours-1", Step.ELIGIBILITE, Status.TODO);
  });

  it.each([StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE])(
    "refus (%s) : conserve le blocage, sans ouvrir l'étape éligibilité",
    async (statut) => {
      const updateStep = prepare(statut);

      await repo.validateInvitation("parcours-1");

      expect(updateStep).toHaveBeenCalledWith("parcours-1", Step.CHOIX_AMO, Status.TODO);
    }
  );

  it("ne touche à rien si le parcours a déjà quitté l'étape invitation", async () => {
    vi.spyOn(repo, "findById").mockResolvedValue({ ...BASE_PARCOURS, currentStep: Step.ELIGIBILITE });
    const updateStep = vi.spyOn(repo, "updateStep");

    await repo.validateInvitation("parcours-1");

    expect(updateStep).not.toHaveBeenCalled();
  });
});

// La promotion de la simulation de l'agent est conditionnée à l'étape invitation, que
// `approveValidation` ne quitte plus. Le prouver demande de rejouer le callback complet.
describe("promotion de la simulation de l'agent au claim", () => {
  it.todo("promeut la simulation de l'agent même si l'AMO a validé avant le claim (intégration)");
});
