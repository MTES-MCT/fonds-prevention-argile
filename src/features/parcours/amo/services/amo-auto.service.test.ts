import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assignAmoAutomatiqueForUser,
  demanderAccompagnementDemandeur,
  passerEnAutonomie,
  skipAmoStepForUser,
} from "./amo-selection.service";
import { db } from "@/shared/database/client";
import { parcoursRepo, dossiersDsTentativesRepo } from "@/shared/database/repositories";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { getDossierByStep } from "../../dossiers-ds/services/dossier-ds.service";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Status, Step } from "../../core";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { ERREUR_CHOIX_AMO_REQUIS } from "../domain/value-objects";
import type { Amo } from "../domain/entities";
import { amoCouvreTerritoire, listerAmosDuTerritoire } from "./amo-couverture.service";

vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    updateStep: vi.fn(),
  },
  dossiersDsTentativesRepo: {
    record: vi.fn(),
    findByParcoursStep: vi.fn(),
  },
}));

vi.mock("@/shared/email/actions/send-email.actions", () => ({
  sendValidationAmoEmail: vi.fn(),
}));

vi.mock("./amo-couverture.service", () => ({
  listerAmosDuTerritoire: vi.fn(),
  amoCouvreTerritoire: vi.fn(),
}));

vi.mock("../../dossiers-ds/services/dossier-ds.service", () => ({
  getDossierByStep: vi.fn(),
}));

// regeneration.service.ts (appelé best-effort par demanderAccompagnementDemandeur) importe
// le client GraphQL DS, qui s'instancie au chargement du module et exige les env vars serveur.
vi.mock("../../dossiers-ds/adapters/graphql/client", () => {
  class DsGraphQLError extends Error {
    readonly code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.name = "DsGraphQLError";
      this.code = code;
    }
  }
  return { graphqlClient: { getDossierStatus: vi.fn() }, DsGraphQLError };
});

vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
}));

vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => "mock-uuid-token"),
});

const userId = "user-123";

const AMO_1 = "11111111-1111-4111-8111-111111111111";
const AMO_2 = "22222222-2222-4222-8222-222222222222";

function amo(id: string, nom: string): Amo {
  return { id, nom, siret: "", departements: "", emails: "", telephone: "", adresse: "" };
}

/** Couverture du territoire : l'AMO unique par défaut, ou plusieurs pour le cas de Cambrai. */
function mockCouverture(amos: Amo[]) {
  vi.mocked(listerAmosDuTerritoire).mockResolvedValue(amos);
  vi.mocked(amoCouvreTerritoire).mockImplementation(async (id) => amos.some((a) => a.id === id));
}

function buildMockParcours(codeInsee: string, codeEpci: string = "") {
  return {
    id: "parcours-789",
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    userId,
    currentStep: Step.CHOIX_AMO,
    currentStatus: Status.TODO,
    completedAt: null,
    rgaSimulationData: {
      logement: {
        commune: codeInsee,
        adresse: "123 rue test",
        code_region: "11",
        code_departement: codeInsee.substring(0, 2),
        epci: codeEpci,
        commune_nom: "Test",
        coordonnees: "0,0",
        clef_ban: "test",
        commune_denormandie: false,
        annee_de_construction: "1990",
        rnb: "RNB_TEST",
        niveaux: 2,
        zone_dexposition: "moyen" as const,
        type: "maison" as const,
        mitoyen: false,
        proprietaire_occupant: true,
      },
      taxeFonciere: { commune_eligible: true },
      rga: {
        assure: true,
        indemnise_indemnise_rga: false,
        sinistres: "saine" as const,
        indemnise_montant_indemnite: 0,
      },
      menage: { revenu_rga: 35000, personnes: 4 },
      vous: { proprietaire_condition: true, proprietaire_occupant_rga: true },
      simulatedAt: new Date().toISOString(),
    },
    rgaSimulationCompletedAt: new Date(),
    rgaDataDeletedAt: null,
    rgaDataDeletionReason: null,
    situationParticulier: SituationParticulier.PROSPECT,
    rgaSimulationDataAgent: null,
    rgaSimulationDataAgentBaseline: null,
    rgaSimulationAgentEditedAt: null,
    rgaSimulationAgentEditedBy: null,
    archivedAt: null,
    archiveReason: null,
    archivedBy: null,
    createdByAgentId: null,
    vulnerabiliteSimulationId: null,
  };
}

describe("assignAmoAutomatiqueForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCouverture([amo(AMO_1, "AMO Test")]);
  });

  it("refuse si le parcours n'existe pas", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(null);
    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({ success: false, error: "Parcours non trouvé" });
  });

  it("refuse si le parcours a dépassé l'étape de choix de l'AMO", async () => {
    const parcours = buildMockParcours("36001");
    parcours.currentStep = Step.ELIGIBILITE;
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({ success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" });
  });

  /**
   * Chaîne complète d'une attribution réussie : aucune validation existante, un AMO sur le
   * territoire, le demandeur, puis la fiche AMO lue pour l'email.
   */
  function mockAttributionComplete() {
    let appel = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.select).mockImplementation((() => {
      appel++;
      const rows =
        appel === 1
          ? [] // aucune validation existante
          : appel === 2
            ? [{ prenom: "Jean", nom: "Dupont", email: "jean@example.fr", emailContact: null, telephone: null }]
            : [{ nom: "AMO Test", emails: "amo@example.fr", telephone: "0102030405", horaires: null }];
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
        }),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);

    const values = vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "validation-1" }]),
      }),
      onConflictDoUpdate: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "validation-1" }]),
      }),
      // db.insert(amoValidationTokens).values(...) — sans returning
      then: undefined,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValue({ values } as any);

    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.mocked(sendValidationAmoEmail).mockResolvedValue({
      success: true,
      data: { messageId: "msg-1" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return { values };
  }

  /** Validation écrite par l'attribution (le premier insert, avant celui du token). */
  function validationEcrite(values: ReturnType<typeof vi.fn>) {
    return values.mock.calls[0][0];
  }

  it("attribue l'AMO à un parcours encore à l'étape invitation", async () => {
    // Dossier créé par un agent, demandeur n'ayant pas encore réclamé son compte : l'AMO
    // doit pouvoir être sollicitée, sinon la qualification de l'Aller-vers n'aboutit à rien.
    const parcours = buildMockParcours("36001");
    parcours.currentStep = Step.INVITATION;
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    mockAttributionComplete();

    const result = await assignAmoAutomatiqueForUser(userId);

    expect(result.success).toBe(true);
    expect(sendValidationAmoEmail).toHaveBeenCalled();
  });

  it("n'écrit pas le statut du parcours tant qu'il est à l'étape invitation", async () => {
    const parcours = buildMockParcours("36001");
    parcours.currentStep = Step.INVITATION;
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    mockAttributionComplete();

    await assignAmoAutomatiqueForUser(userId);

    // `currentStatus` n'a de sens que rattaché à l'étape courante : c'est le claim qui
    // posera EN_INSTRUCTION en même temps que CHOIX_AMO.
    expect(parcoursRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("pose EN_INSTRUCTION quand le parcours est bien à l'étape de choix de l'AMO", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));
    mockAttributionComplete();

    await assignAmoAutomatiqueForUser(userId);

    expect(parcoursRepo.updateStatus).toHaveBeenCalledWith("parcours-789", Status.EN_INSTRUCTION);
  });

  it("est idempotent si une validation existe déjà", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));
    // Premier select : la validation existante
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "existing-validation" }]),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({ success: true, data: { message: "AMO déjà attribuée", token: "" } });
    // selectAmoForUser ne doit pas avoir été appelée → pas d'envoi d'email
    expect(sendValidationAmoEmail).not.toHaveBeenCalled();
  });

  it("refuse sans AMO sur le territoire, quel que soit le mode du département", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));
    mockAttributionComplete();
    mockCouverture([]);

    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({
      success: false,
      error: "Aucun AMO disponible pour le territoire du demandeur",
    });
    expect(sendValidationAmoEmail).not.toHaveBeenCalled();
  });

  it("trace l'AMO unique d'un département à AMO facultative comme désignée par défaut", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));
    const { values } = mockAttributionComplete();

    await assignAmoAutomatiqueForUser(userId);

    expect(validationEcrite(values)).toMatchObject({
      entrepriseAmoId: AMO_1,
      attributionMode: AttributionAmoMode.AUTO_UNIQUE,
    });
  });

  it("trace l'AMO unique d'un département à AMO imposée comme attribuée d'office", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));
    const { values } = mockAttributionComplete();

    await assignAmoAutomatiqueForUser(userId);

    expect(validationEcrite(values)).toMatchObject({ attributionMode: AttributionAmoMode.AUTO_OBLIGATOIRE });
  });

  describe("plusieurs AMO sur le territoire", () => {
    beforeEach(() => {
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("59597", "200068500"));
      mockCouverture([amo(AMO_1, "Argiles du Nord"), amo(AMO_2, "Habitat Cambrésis")]);
    });

    it("ne choisit jamais à la place du demandeur", async () => {
      mockAttributionComplete();

      const result = await assignAmoAutomatiqueForUser(userId);

      expect(result).toEqual({ success: false, error: ERREUR_CHOIX_AMO_REQUIS });
      expect(db.insert).not.toHaveBeenCalled();
      expect(sendValidationAmoEmail).not.toHaveBeenCalled();
    });

    it("sollicite l'AMO choisie par le demandeur", async () => {
      const { values } = mockAttributionComplete();

      const result = await assignAmoAutomatiqueForUser(userId, { entrepriseAmoId: AMO_2, par: "demandeur" });

      expect(result.success).toBe(true);
      expect(validationEcrite(values)).toMatchObject({
        entrepriseAmoId: AMO_2,
        attributionMode: AttributionAmoMode.MANUEL,
      });
    });

    it("trace un choix fait par l'Aller-vers comme tel", async () => {
      const { values } = mockAttributionComplete();

      await assignAmoAutomatiqueForUser(userId, { entrepriseAmoId: AMO_1, par: "agent" });

      expect(validationEcrite(values)).toMatchObject({ attributionMode: AttributionAmoMode.CHOIX_AGENT });
    });

    it("refuse une AMO qui ne couvre pas le territoire", async () => {
      mockAttributionComplete();

      const result = await assignAmoAutomatiqueForUser(userId, {
        entrepriseAmoId: "33333333-3333-4333-8333-333333333333",
        par: "demandeur",
      });

      expect(result).toEqual({ success: false, error: "Cette AMO ne couvre pas le territoire du demandeur" });
      expect(sendValidationAmoEmail).not.toHaveBeenCalled();
    });
  });

  // Un dossier créé par un Aller-vers n'a pas de téléphone : l'exiger bloquait l'attribution
  // en silence (la qualification est best-effort). Le contrôle suivant, l'adresse, tient lui.
  it("n'exige pas le téléphone du demandeur", async () => {
    const parcours = buildMockParcours("36001");
    parcours.rgaSimulationData.logement.adresse = "";
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      const rows =
        selectCallCount === 1
          ? [] // aucune validation existante
          : [{ prenom: "Jean", nom: "Dupont", email: "jean@example.fr", emailContact: null, telephone: null }];
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

    const result = await assignAmoAutomatiqueForUser(userId);

    expect(result).toEqual({
      success: false,
      error: "Adresse du logement manquante dans la simulation RGA",
    });
  });
});

describe("skipAmoStepForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse si le parcours n'existe pas", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(null);
    const result = await skipAmoStepForUser(userId);
    expect(result).toEqual({ success: false, error: "Parcours non trouvé" });
  });

  it("refuse si le parcours n'est plus à CHOIX_AMO/TODO", async () => {
    const parcours = buildMockParcours("82001");
    parcours.currentStatus = Status.EN_INSTRUCTION;
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    const result = await skipAmoStepForUser(userId);
    expect(result).toEqual({ success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" });
  });

  it("refuse en mode OBLIGATOIRE (ex. dept 36)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));
    const result = await skipAmoStepForUser(userId);
    expect(result).toEqual({ success: false, error: "L'AMO est obligatoire pour ce département" });
  });

  it("refuse aussi pour un autre département OBLIGATOIRE (ex. dept 54)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("54001"));
    const result = await skipAmoStepForUser(userId);
    expect(result).toEqual({ success: false, error: "L'AMO est obligatoire pour ce département" });
  });

  it("avance le parcours à ELIGIBILITE en mode FACULTATIF (ex. dept 82)", async () => {
    const parcours = buildMockParcours("82001");
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    vi.mocked(parcoursRepo.updateStep).mockResolvedValue(parcours);

    // L'insertion ne remplace plus une décision existante : `onConflictDoNothing` + returning.
    const insertValuesMock = vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "validation-1" }]),
      }),
    });
    vi.mocked(db.insert).mockReturnValue({
      values: insertValuesMock,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await skipAmoStepForUser(userId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.message).toBe("Parcours avancé à l'étape éligibilité sans AMO");
    }
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parcoursId: parcours.id,
        entrepriseAmoId: null,
        statut: "sans_amo",
        attributionMode: "aucun",
      })
    );
    expect(parcoursRepo.updateStep).toHaveBeenCalledWith(parcours.id, Step.ELIGIBILITE, Status.TODO);
  });
});

describe("demanderAccompagnementDemandeur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCouverture([amo(AMO_1, "AMO Test")]);
    vi.mocked(getDossierByStep).mockResolvedValue(null as never);
    // reinitialiserDossierEtape (best-effort, appelé après l'attribution de l'AMO) :
    // par défaut, aucun dossier éligibilité à réinitialiser (cf. getDossierByStep ci-dessus).
    vi.mocked(parcoursRepo.findById).mockResolvedValue(buildMockParcours("82001"));
  });

  function mockValidationSelect(rows: unknown[]) {
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  it("refuse si le parcours n'existe pas", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(null);
    const result = await demanderAccompagnementDemandeur(userId);
    expect(result).toEqual({ success: false, error: "Parcours non trouvé" });
  });

  it("refuse si aucune validation n'existe (jamais choisi l'autonomie)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));
    mockValidationSelect([]);
    const result = await demanderAccompagnementDemandeur(userId);
    expect(result).toEqual({ success: false, error: "Vous gérez déjà vos démarches avec un accompagnement" });
  });

  it("refuse si le demandeur a déjà un AMO (statut EN_ATTENTE)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));
    mockValidationSelect([{ statut: "en_attente" }]);
    const result = await demanderAccompagnementDemandeur(userId);
    expect(result).toEqual({ success: false, error: "Vous gérez déjà vos démarches avec un accompagnement" });
  });

  it("refuse dans un département où l'AMO est obligatoire (garde défensive)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));
    mockValidationSelect([{ statut: "sans_amo" }]);
    const result = await demanderAccompagnementDemandeur(userId);
    expect(result).toEqual({ success: false, error: "L'AMO est obligatoire pour ce département" });
  });

  it.each([DSStatus.EN_CONSTRUCTION, DSStatus.EN_INSTRUCTION])(
    "bloque tant que la DDT tient le formulaire d'éligibilité (%s)",
    async (dsStatus) => {
      vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));
      mockValidationSelect([{ statut: "sans_amo" }]);
      vi.mocked(getDossierByStep).mockResolvedValue({ dsStatus } as never);

      const result = await demanderAccompagnementDemandeur(userId);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain("transmis");
    }
  );

  it("refuse de désigner une AMO parmi plusieurs sans le choix du demandeur", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));
    mockValidationSelect([{ statut: "sans_amo" }]);
    mockCouverture([amo(AMO_1, "Argiles du Nord"), amo(AMO_2, "Habitat Cambrésis")]);

    const result = await demanderAccompagnementDemandeur(userId);

    expect(result).toEqual({ success: false, error: ERREUR_CHOIX_AMO_REQUIS });
    expect(sendValidationAmoEmail).not.toHaveBeenCalled();
  });

  it("bascule SANS_AMO -> EN_ATTENTE avec l'AMO du territoire, sans toucher le statut/l'étape du parcours", async () => {
    const parcours = buildMockParcours("82001");
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);

    let selectCallCount = 0;
    const rowsByCall: Record<number, unknown[]> = {
      1: [{ statut: "sans_amo" }], // validation existante SANS_AMO
      2: [{ prenom: "Jean", nom: "Dupont", email: "jean@example.fr", emailContact: null, telephone: null }],
      3: [{ nom: "AMO Test", emails: "contact@amo.fr", telephone: "0102030405", horaires: "9h-17h" }],
      4: [{ nom: "AMO Test" }], // nom AMO renvoyé par demanderAccompagnementDemandeur
    };
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(rowsByCall[selectCallCount] ?? []),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "validation-1" }]),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(sendValidationAmoEmail).mockResolvedValue({ success: true, data: { messageId: "msg-1" } });

    const result = await demanderAccompagnementDemandeur(userId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amoNom).toBe("AMO Test");
      expect(result.data.demandeurPrenom).toBe("Jean");
      expect(result.data.demandeurNom).toBe("Dupont");
      // Aucun dossier d'éligibilité à réinitialiser (getDossierByStep -> null par défaut).
      expect(result.data.formulaireReinitialise).toBe(false);
    }
    // Le parcours a déjà quitté CHOIX_AMO : ni le statut ni l'étape ne doivent être touchés,
    // seule la sync DS de l'étape éligibilité pilote current_status.
    expect(parcoursRepo.updateStatus).not.toHaveBeenCalled();
    expect(parcoursRepo.updateStep).not.toHaveBeenCalled();
  });

  it("réinitialise le dossier d'éligibilité (préremplissage sans AMO) s'il n'est pas encore déposé", async () => {
    const parcours = buildMockParcours("82001");
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    vi.mocked(parcoursRepo.findById).mockResolvedValue(parcours);

    // Dossier éligibilité créé sans AMO, jamais déposé -> réinitialisable.
    vi.mocked(getDossierByStep).mockResolvedValue({
      id: "dossier-eligibilite-1",
      dsNumber: "12345",
      dsId: "ds-id-1",
      dsDemarcheId: "demarche-1",
      dsStatus: null,
      createdAt: new Date(Date.now() - 60 * 60_000),
      submittedAt: null,
      lastSyncAt: null,
    } as never);
    vi.mocked(dossiersDsTentativesRepo.record).mockResolvedValue(undefined);
    vi.mocked(dossiersDsTentativesRepo.findByParcoursStep).mockResolvedValue([]);

    let selectCallCount = 0;
    const rowsByCall: Record<number, unknown[]> = {
      1: [{ statut: "sans_amo" }],
      2: [{ prenom: "Jean", nom: "Dupont", email: "jean@example.fr", emailContact: null, telephone: null }],
      3: [{ nom: "AMO Test", emails: "contact@amo.fr", telephone: "0102030405", horaires: "9h-17h" }],
      4: [{ nom: "AMO Test" }],
    };
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      return {
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(rowsByCall[selectCallCount] ?? []),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "validation-1" }]),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "dossier-eligibilite-1" }]),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(sendValidationAmoEmail).mockResolvedValue({ success: true, data: { messageId: "msg-1" } });

    const result = await demanderAccompagnementDemandeur(userId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.formulaireReinitialise).toBe(true);
    }
    expect(dossiersDsTentativesRepo.record).toHaveBeenCalledWith(
      expect.objectContaining({ parcoursId: parcours.id, step: Step.ELIGIBILITE, dsNumber: "12345" })
    );
    expect(db.delete).toHaveBeenCalled();
  });
});

// Sujet 2 — l'attribution doit franchir l'étape invitation : c'est la garde d'étape de
// `selectAmoForUser`, et non celle-ci seule, qui bloque aujourd'hui la transmission.
describe("attribution d'AMO sur un dossier non encore réclamé", () => {
  it.todo("résout le territoire sur la simulation de l'agent quand le demandeur n'a pas simulé");
});

// Deux écritures concurrentes (qualification, claim, réponse AMO) ne doivent produire ni
// doublon ni recul d'étape. Demande un test d'intégration base, pas un mock.
describe("intégrité des transitions d'accompagnement", () => {
  it.todo("deux écritures concurrentes ne produisent ni double token, ni double email, ni recul d'étape");
  it.todo("l'autonomie ne détache pas une AMO apparue entre la lecture et l'écriture");
});

// L'autonomie lit aujourd'hui la seule simulation du demandeur, contrairement à ADR-0037.
describe("passerEnAutonomie — gardes et résolution territoriale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "validation-1" }]),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("résout le département avec repli sur la simulation de l'agent", async () => {
    // Dossier créé par un Aller-vers : le demandeur n'a pas simulé, seule la version agent
    // porte la commune. Lire la seule simulation du demandeur faisait échouer l'autonomie.
    const parcours = buildMockParcours("82001");
    const logementAgent = parcours.rgaSimulationData;
    parcours.rgaSimulationData = null as never;
    parcours.rgaSimulationDataAgent = logementAgent as never;

    const result = await passerEnAutonomie(parcours as never);

    expect(result.success).toBe(true);
    expect(parcoursRepo.updateStep).toHaveBeenCalledWith("parcours-789", Step.ELIGIBILITE, Status.TODO);
  });

  it("refuse quand aucune des deux simulations ne porte de commune exploitable", async () => {
    const parcours = buildMockParcours("82001");
    parcours.rgaSimulationData = null as never;

    const result = await passerEnAutonomie(parcours as never);

    expect(result).toEqual({ success: false, error: "Simulation RGA non complétée (code INSEE invalide)" });
  });

  it("accepte un dossier encore à l'étape invitation, sans toucher à son étape", async () => {
    const parcours = buildMockParcours("82001");
    parcours.currentStep = Step.INVITATION;

    const result = await passerEnAutonomie(parcours as never);

    expect(result.success).toBe(true);
    // C'est le claim qui posera ELIGIBILITE, en lisant le statut « sans AMO ».
    expect(parcoursRepo.updateStep).not.toHaveBeenCalled();
  });

  it("refuse sur un dossier archivé", async () => {
    const parcours = buildMockParcours("82001");
    parcours.archivedAt = new Date() as never;

    const result = await passerEnAutonomie(parcours as never);

    expect(result).toMatchObject({ success: false });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("refuse une fois le parcours parti à l'éligibilité, donc tant que la DDT tient le formulaire", async () => {
    const parcours = buildMockParcours("82001");
    parcours.currentStep = Step.ELIGIBILITE;

    const result = await passerEnAutonomie(parcours as never);

    expect(result).toEqual({ success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" });
  });

  it("n'écrase pas une décision d'accompagnement déjà prise", async () => {
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await passerEnAutonomie(buildMockParcours("82001") as never);

    expect(result).toEqual({ success: false, error: "Un accompagnement a déjà été décidé pour ce dossier" });
    expect(parcoursRepo.updateStep).not.toHaveBeenCalled();
  });
});
