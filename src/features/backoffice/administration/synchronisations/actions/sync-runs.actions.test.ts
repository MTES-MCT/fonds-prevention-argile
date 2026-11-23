import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth", () => ({ checkAgentAccess: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  syncRunRepo: { findRecent: vi.fn(), findByIdWithEntries: vi.fn() },
}));
vi.mock("@/features/parcours/dossiers-ds/services/parcours-sync-batch.service", () => ({ runSyncBatch: vi.fn() }));

import { checkAgentAccess } from "@/features/auth";
import { syncRunRepo } from "@/shared/database/repositories";
import { runSyncBatch } from "@/features/parcours/dossiers-ds/services/parcours-sync-batch.service";
import { getSyncRunDetailAction, listSyncRunsAction, triggerManualSyncAction } from "./sync-runs.actions";

const ACTIONS = [
  ["listSyncRunsAction", () => listSyncRunsAction()],
  ["getSyncRunDetailAction", () => getSyncRunDetailAction("run-1")],
  ["triggerManualSyncAction", () => triggerManualSyncAction()],
] as const;

const ROLES_REFUSES = [
  UserRole.ADMINISTRATEUR,
  UserRole.ANALYSTE,
  UserRole.AMO,
  UserRole.ALLERS_VERS,
  UserRole.AMO_ET_ALLERS_VERS,
  UserRole.PARTICULIER,
];

function aucunEffet() {
  expect(syncRunRepo.findRecent).not.toHaveBeenCalled();
  expect(syncRunRepo.findByIdWithEntries).not.toHaveBeenCalled();
  expect(runSyncBatch).not.toHaveBeenCalled();
}

// RBAC-TEST-PLAN § 7 : consulter ou lancer une synchronisation est réservé au super-administrateur.
describe("sync-runs.actions — réservées au super-administrateur", () => {
  beforeEach(() => vi.clearAllMocks());

  describe.each(ACTIONS)("%s", (_nom, appeler) => {
    it("sans session → refus, ni lecture ni synchronisation", async () => {
      vi.mocked(checkAgentAccess).mockResolvedValue({ hasAccess: false, errorCode: "NOT_AUTHENTICATED" } as never);

      expect(await appeler()).toEqual({ success: false, error: "Non authentifié" });
      aucunEffet();
    });

    it.each(ROLES_REFUSES)("rôle %s → refus, ni lecture ni synchronisation", async (role) => {
      vi.mocked(checkAgentAccess).mockResolvedValue({ hasAccess: true, user: { role } } as never);

      expect(await appeler()).toEqual({ success: false, error: "Accès réservé aux super-administrateurs" });
      aucunEffet();
    });
  });

  it("super-administrateur → lance la synchronisation manuelle", async () => {
    vi.mocked(checkAgentAccess).mockResolvedValue({
      hasAccess: true,
      user: { role: UserRole.SUPER_ADMINISTRATEUR },
    } as never);
    vi.mocked(runSyncBatch).mockResolvedValue({ skipped: true, reason: "déjà en cours", existingRunId: "r" } as never);

    expect((await triggerManualSyncAction()).success).toBe(true);
    expect(runSyncBatch).toHaveBeenCalledOnce();
  });
});
