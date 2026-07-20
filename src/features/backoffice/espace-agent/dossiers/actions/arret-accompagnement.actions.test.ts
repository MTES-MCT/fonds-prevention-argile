import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({
  assertNotSuperAdminReadOnly: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/features/auth/permissions/services/responsable-permissions.service", () => ({
  assertCanActAsResponsable: vi.fn(),
}));
vi.mock("@/features/parcours/amo/services/detachement-amo.service", () => ({ detacherAmo: vi.fn() }));
vi.mock("@/features/parcours/amo/services/arret-accompagnement.service", () => ({ refuserDemandeArret: vi.fn() }));
vi.mock("@/features/backoffice/espace-agent/shared/services/author-snapshot", () => ({
  buildAuthorSnapshot: vi.fn().mockResolvedValue({
    authorName: "Michel M.",
    authorStructure: "SOLHA Indre",
    authorStructureType: "AMO",
  }),
}));
vi.mock("@/shared/database/repositories", () => ({ parcoursActionsRepo: { create: vi.fn() } }));

import { arreterAccompagnementAction, refuserArretAccompagnementAction } from "./arret-accompagnement.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { assertCanActAsResponsable } from "@/features/auth/permissions/services/responsable-permissions.service";
import { detacherAmo } from "@/features/parcours/amo/services/detachement-amo.service";
import { refuserDemandeArret } from "@/features/parcours/amo/services/arret-accompagnement.service";
import { parcoursActionsRepo } from "@/shared/database/repositories";

const PARCOURS_ID = "11111111-1111-1111-1111-111111111111";

function mockAgent(role: UserRole) {
  vi.mocked(getCurrentAgent).mockResolvedValue({
    success: true,
    data: { id: "agent-1", role, entrepriseAmoId: "entreprise-123", allersVersId: null },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe("arreterAccompagnementAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(assertCanActAsResponsable).mockResolvedValue({ ok: true } as any);
    vi.mocked(detacherAmo).mockResolvedValue({
      success: true,
      data: {
        etapeAvancee: false,
        entrepriseAmoId: "entreprise-123",
        amoNom: "SOLHA Indre",
        amoEmails: "a@b.fr",
        demandeurNom: "Abitbol",
        demandeurPrenom: "Georges",
      },
    });
    mockAgent(UserRole.AMO);
  });

  it("détache l'AMO et trace une action avec les raisons", async () => {
    const result = await arreterAccompagnementAction(PARCOURS_ID, ["Reste à charge trop élevé", "Autre : bla bla bla"]);

    expect(result.success).toBe(true);
    expect(detacherAmo).toHaveBeenCalledWith({ parcoursId: PARCOURS_ID });
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parcoursId: PARCOURS_ID,
        actionType: "accompagnement_arrete",
        message: "Reste à charge trop élevé - Autre : bla bla bla",
        authorName: "Michel M.",
      })
    );
  });

  it("refuse un rôle non AMO (ALLERS_VERS)", async () => {
    mockAgent(UserRole.ALLERS_VERS);

    const result = await arreterAccompagnementAction(PARCOURS_ID, ["Reste à charge trop élevé"]);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("réservée aux AMO");
    expect(detacherAmo).not.toHaveBeenCalled();
  });

  it("refuse un AMO qui n'est pas responsable du dossier", async () => {
    vi.mocked(assertCanActAsResponsable).mockResolvedValue({
      ok: false,
      error: "Action réservée au responsable",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await arreterAccompagnementAction(PARCOURS_ID, ["Reste à charge trop élevé"]);

    expect(result.success).toBe(false);
    expect(detacherAmo).not.toHaveBeenCalled();
  });

  it("refuse le super-admin en lecture seule", async () => {
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue("Lecture seule");

    const result = await arreterAccompagnementAction(PARCOURS_ID, ["Reste à charge trop élevé"]);

    expect(result.success).toBe(false);
    expect(detacherAmo).not.toHaveBeenCalled();
  });

  it("exige au moins une raison", async () => {
    const result = await arreterAccompagnementAction(PARCOURS_ID, ["  "]);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("au moins une raison");
    expect(detacherAmo).not.toHaveBeenCalled();
  });

  it("ne trace aucune action si le détachement échoue", async () => {
    vi.mocked(detacherAmo).mockResolvedValue({ success: false, error: "Parcours archivé" });

    const result = await arreterAccompagnementAction(PARCOURS_ID, ["Reste à charge trop élevé"]);

    expect(result.success).toBe(false);
    expect(parcoursActionsRepo.create).not.toHaveBeenCalled();
  });
});

describe("refuserArretAccompagnementAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(assertCanActAsResponsable).mockResolvedValue({ ok: true } as any);
    vi.mocked(refuserDemandeArret).mockResolvedValue({
      success: true,
      data: { demandeurPrenom: "Georges", demandeurNom: "Abitbol" },
    });
    mockAgent(UserRole.AMO_ET_ALLERS_VERS);
  });

  it("efface la demande d'arrêt et trace le refus", async () => {
    const result = await refuserArretAccompagnementAction(PARCOURS_ID);

    expect(result.success).toBe(true);
    expect(refuserDemandeArret).toHaveBeenCalledWith({ parcoursId: PARCOURS_ID });
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "arret_accompagnement_refuse" })
    );
  });

  it("refuse un rôle non AMO", async () => {
    mockAgent(UserRole.ANALYSTE);

    const result = await refuserArretAccompagnementAction(PARCOURS_ID);

    expect(result.success).toBe(false);
    expect(refuserDemandeArret).not.toHaveBeenCalled();
  });
});
