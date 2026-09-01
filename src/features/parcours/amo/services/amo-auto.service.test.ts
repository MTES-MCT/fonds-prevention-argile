import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  assignAmoAutomatiqueForUser,
  demanderAccompagnementDemandeur,
  skipAmoStepForUser,
} from "./amo-selection.service";
import { db } from "@/shared/database/client";
import { parcoursRepo, dossiersDsTentativesRepo } from "@/shared/database/repositories";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { getDossierByStep } from "../../dossiers-ds/services/dossier-ds.service";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Status, Step } from "../../core";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";

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
  };
}

describe("assignAmoAutomatiqueForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuse si le parcours n'existe pas", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(null);
    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({ success: false, error: "Parcours non trouvé" });
  });

  it("refuse si le parcours n'est plus à l'étape CHOIX_AMO", async () => {
    const parcours = buildMockParcours("36001");
    parcours.currentStep = Step.ELIGIBILITE;
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);
    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({ success: false, error: "Le parcours n'est plus à l'étape de choix de l'AMO" });
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

  it("auto-attribue aussi en mode FACULTATIF (utilisé par CalloutChoixAccompagnement après 'Oui')", async () => {
    // En mode FACULTATIF, la fonction est appelée explicitement après que l'utilisateur a
    // confirmé "Oui" dans le callout de choix. On prend le 1er AMO du territoire (skip de
    // l'étape liste de sélection manuelle).
    // Ici le dept 82 n'a aucun AMO → on doit sortir avec l'erreur générique "aucun AMO disponible"
    // (et PAS avec une erreur de mode).
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      // 1er select : validation existante → aucune
      // 2e select : recherche AMO par département → aucun
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({
      success: false,
      error: "Aucun AMO disponible pour le territoire du demandeur",
    });
    expect(selectCallCount).toBeGreaterThan(1); // ne sort plus au check de mode
  });

  it("refuse si aucun AMO ne couvre le territoire (dept obligatoire 36)", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("36001"));

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // Validation existante : aucune
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;
      }
      // Recherche AMO par département : aucun
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

    const result = await assignAmoAutomatiqueForUser(userId);
    expect(result).toEqual({
      success: false,
      error: "Aucun AMO disponible pour le territoire du demandeur",
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
          : selectCallCount === 2
            ? [{ id: "amo-1" }] // AMO du département
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

    const insertValuesMock = vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
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

  it("bloque si le formulaire d'éligibilité est déjà en instruction", async () => {
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(buildMockParcours("82001"));
    mockValidationSelect([{ statut: "sans_amo" }]);
    vi.mocked(getDossierByStep).mockResolvedValue({ dsStatus: DSStatus.EN_INSTRUCTION } as never);

    const result = await demanderAccompagnementDemandeur(userId);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("instruction");
  });

  it("bascule SANS_AMO -> EN_ATTENTE avec le 1er AMO du territoire, sans toucher le statut/l'étape du parcours", async () => {
    const parcours = buildMockParcours("82001");
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue(parcours);

    let selectCallCount = 0;
    const rowsByCall: Record<number, unknown[]> = {
      1: [{ statut: "sans_amo" }], // validation existante SANS_AMO
      2: [{ id: "amo-1" }], // findFirstAmoForTerritory (département)
      3: [{ prenom: "Jean", nom: "Dupont", email: "jean@example.fr", emailContact: null, telephone: null }],
      4: [{ id: "amo-1" }], // checkAmoCoversTerritory (dans selectAmoForUser)
      5: [{ nom: "AMO Test", emails: "contact@amo.fr", telephone: "0102030405", horaires: "9h-17h" }],
      6: [{ nom: "AMO Test" }], // nom AMO renvoyé par demanderAccompagnementDemandeur
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
      2: [{ id: "amo-1" }],
      3: [{ prenom: "Jean", nom: "Dupont", email: "jean@example.fr", emailContact: null, telephone: null }],
      4: [{ id: "amo-1" }],
      5: [{ nom: "AMO Test", emails: "contact@amo.fr", telephone: "0102030405", horaires: "9h-17h" }],
      6: [{ nom: "AMO Test" }],
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
