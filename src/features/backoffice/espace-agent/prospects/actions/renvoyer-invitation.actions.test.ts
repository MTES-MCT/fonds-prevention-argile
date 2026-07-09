import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  verifyProspectTerritoryAccess: vi.fn(),
}));
vi.mock("@/features/backoffice/espace-agent/creation-dossier/services/renvoyer-invitation.service", () => ({
  renvoyerInvitationClaim: vi.fn(),
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/author-snapshot", () => ({
  buildAuthorSnapshot: vi.fn().mockResolvedValue({
    authorName: "Jean Test",
    authorStructure: "ACME",
    authorStructureType: "ALLERS_VERS",
  }),
}));
vi.mock("@/shared/database/repositories", () => ({
  parcoursActionsRepo: { create: vi.fn() },
}));

import { renvoyerInvitationAction } from "./renvoyer-invitation.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import { renvoyerInvitationClaim } from "@/features/backoffice/espace-agent/creation-dossier/services/renvoyer-invitation.service";
import { parcoursActionsRepo } from "@/shared/database/repositories";

const PARCOURS_ID = "11111111-1111-1111-1111-111111111111";

function mockAgent(role: UserRole, extra: { entrepriseAmoId?: string | null; allersVersId?: string | null } = {}) {
  vi.mocked(getCurrentAgent).mockResolvedValue({
    success: true,
    data: { id: "agent-1", role, entrepriseAmoId: null, allersVersId: null, ...extra },
  } as never);
}

describe("renvoyerInvitationAction — RBAC & garde", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renvoyerInvitationClaim).mockResolvedValue({ success: true, emailSent: true });
  });

  it("refuse un non-authentifié sans appeler le service", async () => {
    vi.mocked(getCurrentAgent).mockResolvedValue({ success: false, error: "Non connecté" } as never);

    const res = await renvoyerInvitationAction(PARCOURS_ID);

    expect(res.success).toBe(false);
    expect(verifyProspectTerritoryAccess).not.toHaveBeenCalled();
    expect(renvoyerInvitationClaim).not.toHaveBeenCalled();
  });

  it("refuse un agent hors territoire (aligné sur la visibilité du détail)", async () => {
    mockAgent(UserRole.ALLERS_VERS, { allersVersId: "av-1" });
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue("Ce prospect n'est pas dans votre territoire");

    const res = await renvoyerInvitationAction(PARCOURS_ID);

    expect(res.success).toBe(false);
    expect(renvoyerInvitationClaim).not.toHaveBeenCalled();
    expect(parcoursActionsRepo.create).not.toHaveBeenCalled();
  });

  it("autorise un agent du territoire, renvoie l'invitation et trace l'action", async () => {
    mockAgent(UserRole.ALLERS_VERS, { allersVersId: "av-1" });
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);

    const res = await renvoyerInvitationAction(PARCOURS_ID);

    expect(res.success).toBe(true);
    expect(renvoyerInvitationClaim).toHaveBeenCalledWith({ parcoursId: PARCOURS_ID, agentId: "agent-1" });
    expect(parcoursActionsRepo.create).toHaveBeenCalledTimes(1);
  });

  it("remonte l'erreur métier du service (ex. déjà réclamé) sans tracer d'action", async () => {
    mockAgent(UserRole.ALLERS_VERS, { allersVersId: "av-1" });
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);
    vi.mocked(renvoyerInvitationClaim).mockResolvedValue({
      success: false,
      error: "Le demandeur a déjà réclamé son dossier.",
    });

    const res = await renvoyerInvitationAction(PARCOURS_ID);

    expect(res.success).toBe(false);
    expect(parcoursActionsRepo.create).not.toHaveBeenCalled();
  });
});
