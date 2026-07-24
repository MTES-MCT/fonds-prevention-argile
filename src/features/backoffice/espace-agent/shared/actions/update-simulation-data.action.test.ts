import { describe, it, expect, vi, beforeEach } from "vitest";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { UserRole } from "@/shared/domain/value-objects";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";

vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({
  assertNotSuperAdminReadOnly: vi.fn(async () => null),
}));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({
  getCurrentAgent: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../services/eligibilite-agent.service", () => ({
  evaluateAgentSimulation: vi.fn(),
  buildEligibiliteArchiveNote: vi.fn(() => "note-archivage"),
  isEligibiliteArchiveReason: vi.fn(
    (r: string | null | undefined) => typeof r === "string" && r.startsWith("Non éligible")
  ),
}));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  verifyProspectTerritoryAccess: vi.fn(async () => null),
  calculateAgentScope: vi.fn(async () => ({ canViewDossiersWithoutAmo: true, departements: ["01"], epcis: [] })),
}));
vi.mock("@/shared/database/repositories", () => ({
  parcoursActionsRepo: { create: vi.fn(async () => undefined) },
}));
vi.mock("../services/author-snapshot", () => ({
  buildAuthorSnapshot: vi.fn(async () => ({
    authorName: "Agent Test",
    authorStructure: null,
    authorStructureType: "ADMINISTRATION",
  })),
}));

// db.select → ligne validation/parcours ; db.transaction(cb) → exécute cb avec un
// tx dont on capture les .update().set().
const txSetSpy = vi.fn(() => ({ where: vi.fn(async () => undefined) }));
const txUpdateSpy = vi.fn(() => ({ set: txSetSpy }));
vi.mock("@/shared/database/client", () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<void>) => cb({ update: txUpdateSpy })),
  },
}));

import { updateSimulationDataAction } from "./update-simulation-data.action";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { db } from "@/shared/database/client";
import { evaluateAgentSimulation } from "../services/eligibilite-agent.service";
import {
  verifyProspectTerritoryAccess,
  calculateAgentScope,
} from "@/features/auth/permissions/services/agent-scope.service";
import { parcoursActionsRepo } from "@/shared/database/repositories";
import { ACTION_TYPE_ELIGIBILITE_REFUSEE } from "../domain/types/action.types";

const mockValidationRow = (
  statut: StatutValidationAmo,
  entrepriseAmoId: string | null = "amo-A",
  parcoursExtra: Record<string, unknown> = {}
) => {
  vi.mocked(db.select).mockReturnValue({
    from: vi.fn().mockReturnValue({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              validation: { id: "validation-1", statut, entrepriseAmoId },
              parcours: { id: "parcours-1", archivedAt: null, archiveReason: null, ...parcoursExtra },
            },
          ]),
        }),
      }),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
};

// Fallback prospect : 3 requêtes db.select successives —
// 1) validation par id (vide) ; 2) parcours par id ; 3) validation existante par parcoursId.
const mockProspectRow = (
  parcoursExtra: Record<string, unknown> = {},
  existingValidationRows: Array<{ id: string }> = []
) => {
  const noInnerJoin = (rows: unknown[]) =>
    ({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }) }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

  vi.mocked(db.select)
    .mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .mockReturnValueOnce(noInnerJoin([{ id: "parcours-1", archivedAt: null, archiveReason: null, ...parcoursExtra }]))
    .mockReturnValueOnce(noInnerJoin(existingValidationRows));
};

const rgaData = { logement: { adresse: "X" } } as unknown as RGASimulationData;

describe("updateSimulationDataAction — recalcul du statut d'éligibilité", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-1", role: UserRole.AMO, entrepriseAmoId: "amo-A", allersVersId: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("bascule LOGEMENT_ELIGIBLE → LOGEMENT_NON_ELIGIBLE et archive (dans une transaction)", async () => {
    mockValidationRow(StatutValidationAmo.LOGEMENT_ELIGIBLE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE })
    );
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        situationParticulier: SituationParticulier.ARCHIVE,
        archiveReason: "note-archivage",
        archivedBy: "agent-1",
      })
    );
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ parcoursId: "parcours-1", actionType: ACTION_TYPE_ELIGIBILITE_REFUSEE })
    );
  });

  it("bascule LOGEMENT_NON_ELIGIBLE → LOGEMENT_ELIGIBLE et dé-archive", async () => {
    // Dossier archivé POUR inéligibilité (note préfixée « Non éligible ») → dé-archivable.
    mockValidationRow(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, "amo-A", {
      archivedAt: new Date(),
      archiveReason: "Non éligible (simulation corrigée par un agent) — critère X",
    });
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: true } as never,
      isEligible: true,
      isNonEligible: false,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(txSetSpy).toHaveBeenCalledWith(expect.objectContaining({ statut: StatutValidationAmo.LOGEMENT_ELIGIBLE }));
    // Dossier avec entreprise AMO → réactivation en ELIGIBLE (aligné sur le dé-archivage manuel).
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ situationParticulier: SituationParticulier.ELIGIBLE, archivedAt: null })
    );
    // Un retour à l'éligibilité n'est pas un refus : aucune action d'audit "refus" tracée.
    expect(parcoursActionsRepo.create).not.toHaveBeenCalled();
  });

  it("ne réécrit ni statut ni archivage quand le verdict est inchangé (reste éligible)", async () => {
    mockValidationRow(StatutValidationAmo.LOGEMENT_ELIGIBLE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: true } as never,
      isEligible: true,
      isNonEligible: false,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    // Seule l'écriture de simulation a lieu (pas de transition) → aucun set de statut.
    expect(txSetSpy).toHaveBeenCalledTimes(1);
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ statut: expect.anything() }));
  });

  it("archive un dossier EN_ATTENTE devenu inéligible ET refuse l'accompagnement (flip de statut)", async () => {
    mockValidationRow(StatutValidationAmo.EN_ATTENTE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    // Archivage du parcours (honore la promesse UI)…
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        situationParticulier: SituationParticulier.ARCHIVE,
        archiveReason: "note-archivage",
        archivedBy: "agent-1",
      })
    );
    // … ET refus de l'accompagnement : un verdict non éligible tranche TOUJOURS la
    // validation AMO, même EN_ATTENTE — la simulation fait foi sur le critère d'éligibilité.
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE })
    );
    // Action d'audit tracée dans l'historique du dossier.
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ parcoursId: "parcours-1", actionType: ACTION_TYPE_ELIGIBILITE_REFUSEE })
    );
  });

  it("archive un dossier SANS_AMO devenu inéligible ET refuse l'accompagnement (flip de statut)", async () => {
    mockValidationRow(StatutValidationAmo.SANS_AMO);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ situationParticulier: SituationParticulier.ARCHIVE, archivedBy: "agent-1" })
    );
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE })
    );
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ parcoursId: "parcours-1", actionType: ACTION_TYPE_ELIGIBILITE_REFUSEE })
    );
  });

  it("idempotence : dossier déjà archivé et toujours inéligible → n'écrit pas archivedAt", async () => {
    mockValidationRow(StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, "amo-A", {
      archivedAt: new Date(),
      archiveReason: "Non éligible (simulation corrigée par un agent) — critère X",
    });
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    // Statut inchangé (déjà NON_ELIGIBLE) + pas de ré-archivage → seule la simulation est écrite.
    expect(txSetSpy).toHaveBeenCalledTimes(1);
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ archivedAt: expect.anything() }));
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ situationParticulier: expect.anything() }));
  });

  it("persiste une simulation indécise sans statut ni archivage (dossier déjà tranché)", async () => {
    mockValidationRow(StatutValidationAmo.LOGEMENT_ELIGIBLE);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: null,
      isEligible: false,
      isNonEligible: false,
    });

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(txSetSpy).toHaveBeenCalledTimes(1);
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ statut: expect.anything() }));
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ situationParticulier: expect.anything() }));
  });
});

describe("updateSimulationDataAction — autorisation SANS_AMO (Aller-vers)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: null,
      isEligible: false,
      isNonEligible: false,
    });
    // Agent Aller-vers : pas d'entreprise AMO.
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-av", role: UserRole.ALLERS_VERS, entrepriseAmoId: null, allersVersId: "av-1" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("autorise l'écriture via l'accès territorial (dossier sans entreprise)", async () => {
    mockValidationRow(StatutValidationAmo.SANS_AMO, null);
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(true);
    expect(verifyProspectTerritoryAccess).toHaveBeenCalledWith(
      "parcours-1",
      expect.objectContaining({ role: UserRole.ALLERS_VERS, allersVersId: "av-1" })
    );
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });

  it("refuse l'écriture hors territoire (aucune écriture)", async () => {
    mockValidationRow(StatutValidationAmo.SANS_AMO, null);
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue("Ce prospect n'est pas dans votre territoire");

    const result = await updateSimulationDataAction("validation-1", rgaData);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ce prospect n'est pas dans votre territoire");
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe("updateSimulationDataAction — fallback prospect (sans validation AMO)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks ne vide PAS la file mockReturnValueOnce : un test admin (qui saute la
    // requête existingValidation) laisserait une valeur non consommée, désynchronisant la
    // file db.select des tests suivants. mockReset la vide.
    vi.mocked(db.select).mockReset();
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-1", role: UserRole.ALLERS_VERS, entrepriseAmoId: null, allersVersId: "av-1" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    // Reset explicite : clearAllMocks ne réinitialise pas les implémentations, et un test
    // d'un autre bloc a posé un mockResolvedValue persistant (fuite entre describes).
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);
    vi.mocked(calculateAgentScope).mockResolvedValue({
      canViewDossiersWithoutAmo: true,
      departements: ["01"],
      epcis: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("archive le prospect devenu inéligible (transaction atomique)", async () => {
    mockProspectRow();
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(true);
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        situationParticulier: SituationParticulier.ARCHIVE,
        archiveReason: "note-archivage",
        archivedBy: "agent-1",
      })
    );
  });

  it("dé-archive (en PROSPECT) un prospect redevenu éligible archivé pour inéligibilité", async () => {
    mockProspectRow({
      archivedAt: new Date(),
      archiveReason: "Non éligible (simulation corrigée par un agent) — critère X",
    });
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: true } as never,
      isEligible: true,
      isNonEligible: false,
    });

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(true);
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ situationParticulier: SituationParticulier.PROSPECT, archivedAt: null })
    );
  });

  it("ne dé-archive pas un prospect archivé manuellement (raison ≠ inéligibilité)", async () => {
    mockProspectRow({ archivedAt: new Date(), archiveReason: "Le demandeur a abandonné le projet" });
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: true } as never,
      isEligible: true,
      isNonEligible: false,
    });

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(true);
    // Seule l'écriture de simulation a lieu, aucun changement de situation.
    expect(txSetSpy).toHaveBeenCalledTimes(1);
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ situationParticulier: expect.anything() }));
  });

  it("refuse un AMO pur (capacité dossiers sans AMO absente)", async () => {
    // Vrai agent AMO (rôle + entreprise), pas un AV avec capacité forcée.
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-amo", role: UserRole.AMO, entrepriseAmoId: "amo-A", allersVersId: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockProspectRow();
    // Scope AMO : porte un territoire (via entreprise) mais PAS la capacité sans-AMO.
    vi.mocked(calculateAgentScope).mockResolvedValue({
      canViewDossiersWithoutAmo: false,
      departements: ["01"],
      epcis: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ce dossier ne vous est pas destiné");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("ADMINISTRATEUR : bypass assumé des gardes fallback (voit tout, national)", async () => {
    // Comportement by-design pré-existant (isAdmin = SUPER_ADMIN | ADMINISTRATEUR) : un
    // admin national court-circuite les gardes fallback. Test de verrouillage, pas de fuite.
    vi.mocked(getCurrentAgent).mockResolvedValue({
      success: true,
      data: { id: "agent-admin", role: UserRole.ADMINISTRATEUR, entrepriseAmoId: null, allersVersId: null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockProspectRow();
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(true);
    // Gardes non appelées (bypass admin) mais archivage bien appliqué.
    expect(calculateAgentScope).not.toHaveBeenCalled();
    expect(txSetSpy).toHaveBeenCalledWith(
      expect.objectContaining({ situationParticulier: SituationParticulier.ARCHIVE })
    );
  });

  it("échec de la transaction → échec de l'action (pas de faux succès)", async () => {
    mockProspectRow();
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });
    vi.mocked(db.transaction).mockRejectedValueOnce(new Error("écriture archivage échouée"));

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(false);
  });

  it("refuse si une validation AMO existe pour ce parcours (pas de contournement via parcoursId)", async () => {
    mockProspectRow({}, [{ id: "validation-x" }]);
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Ce dossier ne vous est pas destiné");
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("refuse un prospect hors territoire", async () => {
    mockProspectRow();
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValueOnce("Ce prospect n'est pas dans votre territoire");
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: { eligible: false } as never,
      isEligible: false,
      isNonEligible: true,
    });

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("persiste une simulation indécise sans toucher à la situation (prospect)", async () => {
    mockProspectRow();
    vi.mocked(evaluateAgentSimulation).mockReturnValue({
      result: null,
      isEligible: false,
      isNonEligible: false,
    });

    const result = await updateSimulationDataAction("parcours-1", rgaData);

    expect(result.success).toBe(true);
    expect(txSetSpy).toHaveBeenCalledTimes(1);
    expect(txSetSpy).not.toHaveBeenCalledWith(expect.objectContaining({ situationParticulier: expect.anything() }));
  });
});
