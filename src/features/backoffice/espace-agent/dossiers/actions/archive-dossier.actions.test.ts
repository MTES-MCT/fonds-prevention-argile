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
vi.mock("@/shared/database/repositories/parcours-prevention.repository", () => ({
  parcoursPreventionRepository: { updateSituationParticulier: vi.fn() },
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/action-audit.service", () => ({
  logSystemAction: vi.fn(async () => true),
}));

import { archiveDossierAction, unarchiveDossierAction } from "./archive-dossier.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { assertCanActAsResponsable } from "@/features/auth/permissions/services/responsable-permissions.service";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import {
  ACTION_TYPE_DOSSIER_ARCHIVE,
  ACTION_TYPE_DOSSIER_DESARCHIVE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";

const PARCOURS_ID = "11111111-1111-1111-1111-111111111111";
const AGENT = { id: "agent-1", role: UserRole.AMO, entrepriseAmoId: "entreprise-123", allersVersId: null };

function mockAgentConnecte() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: AGENT } as any);
}

describe("archiveDossierAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(assertCanActAsResponsable).mockResolvedValue({ ok: true, responsable: { type: "AMO" } } as any);
    mockAgentConnecte();
  });

  it("archive le dossier et trace l'action avec la raison saisie", async () => {
    const result = await archiveDossierAction(PARCOURS_ID, "Ménage injoignable");

    expect(result.success).toBe(true);
    expect(parcoursPreventionRepository.updateSituationParticulier).toHaveBeenCalledWith(
      PARCOURS_ID,
      SituationParticulier.ARCHIVE,
      "Ménage injoignable",
      "agent-1"
    );
    expect(logSystemAction).toHaveBeenCalledWith({
      parcoursId: PARCOURS_ID,
      author: { agent: AGENT },
      actionType: ACTION_TYPE_DOSSIER_ARCHIVE,
      message: "Ménage injoignable",
    });
  });

  it("refuse le super-admin en lecture seule, sans rien tracer", async () => {
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue("Lecture seule");

    const result = await archiveDossierAction(PARCOURS_ID, "Abandon");

    expect(result).toEqual({ success: false, error: "Lecture seule" });
    expect(parcoursPreventionRepository.updateSituationParticulier).not.toHaveBeenCalled();
    expect(logSystemAction).not.toHaveBeenCalled();
  });

  it("refuse un agent qui n'est pas responsable du dossier, sans rien tracer", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(assertCanActAsResponsable).mockResolvedValue({ ok: false, error: "Non responsable" } as any);

    const result = await archiveDossierAction(PARCOURS_ID, "Abandon");

    expect(result).toEqual({ success: false, error: "Non responsable" });
    expect(parcoursPreventionRepository.updateSituationParticulier).not.toHaveBeenCalled();
    expect(logSystemAction).not.toHaveBeenCalled();
  });
});

describe("unarchiveDossierAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(assertCanActAsResponsable).mockResolvedValue({ ok: true, responsable: { type: "AMO" } } as any);
    mockAgentConnecte();
  });

  it("dé-archive le dossier et trace l'action", async () => {
    const result = await unarchiveDossierAction(PARCOURS_ID);

    expect(result.success).toBe(true);
    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({ parcoursId: PARCOURS_ID, actionType: ACTION_TYPE_DOSSIER_DESARCHIVE })
    );
  });

  it("réactive un prospect en PROSPECT quand aucun AMO n'est responsable", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(assertCanActAsResponsable).mockResolvedValue({ ok: true, responsable: { type: "ALLERS_VERS" } } as any);

    await unarchiveDossierAction(PARCOURS_ID);

    expect(parcoursPreventionRepository.updateSituationParticulier).toHaveBeenCalledWith(
      PARCOURS_ID,
      SituationParticulier.PROSPECT
    );
  });
});
