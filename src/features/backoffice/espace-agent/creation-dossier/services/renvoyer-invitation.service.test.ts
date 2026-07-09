import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findById: vi.fn() },
  userRepo: { findById: vi.fn(), setClaimToken: vi.fn() },
}));
vi.mock("@/shared/config/env.config", () => ({ getServerEnv: () => ({ BASE_URL: "https://app.test" }) }));
vi.mock("@/features/auth/utils/oauth.utils", () => ({ generateSecureRandomString: () => "NEW_TOKEN" }));
vi.mock("@/shared/email/actions/send-claim-dossier.actions", () => ({ sendClaimDossierEmail: vi.fn() }));
vi.mock("./inviter-name.service", () => ({ getInviterName: vi.fn().mockResolvedValue("Structure AV") }));

import { renvoyerInvitationClaim } from "./renvoyer-invitation.service";
import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { sendClaimDossierEmail } from "@/shared/email/actions/send-claim-dossier.actions";

const PARCOURS_ID = "11111111-1111-1111-1111-111111111111";
const USER_ID = "22222222-2222-2222-2222-222222222222";
const FUTURE = new Date(Date.now() + 60 * 60 * 1000);
const PAST = new Date(Date.now() - 60 * 60 * 1000);

const baseParcours = {
  id: PARCOURS_ID,
  userId: USER_ID,
  createdByAgentId: "agent-1",
  archivedAt: null,
  rgaSimulationData: { logement: {} },
  rgaSimulationDataAgent: null,
};

const baseStub = {
  id: USER_ID,
  email: "demandeur@test.fr",
  prenom: "Jean",
  nom: "Dupont",
  fcId: null,
  claimedAt: null,
  claimToken: "OLD_TOKEN",
  claimTokenExpiresAt: FUTURE,
};

describe("renvoyerInvitationClaim — gardes métier & token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendClaimDossierEmail).mockResolvedValue({ success: true, data: { messageId: "id" } });
  });

  it("refuse un dossier non créé par un agent", async () => {
    vi.mocked(parcoursRepo.findById).mockResolvedValue({ ...baseParcours, createdByAgentId: null } as never);

    const res = await renvoyerInvitationClaim({ parcoursId: PARCOURS_ID, agentId: "agent-1" });

    expect(res.success).toBe(false);
    expect(sendClaimDossierEmail).not.toHaveBeenCalled();
  });

  it("refuse un dossier archivé", async () => {
    vi.mocked(parcoursRepo.findById).mockResolvedValue({ ...baseParcours, archivedAt: new Date() } as never);

    const res = await renvoyerInvitationClaim({ parcoursId: PARCOURS_ID, agentId: "agent-1" });

    expect(res.success).toBe(false);
    expect(sendClaimDossierEmail).not.toHaveBeenCalled();
  });

  it("refuse si le demandeur a déjà réclamé (fcId présent)", async () => {
    vi.mocked(parcoursRepo.findById).mockResolvedValue(baseParcours as never);
    vi.mocked(userRepo.findById).mockResolvedValue({ ...baseStub, fcId: "fc-abc" } as never);

    const res = await renvoyerInvitationClaim({ parcoursId: PARCOURS_ID, agentId: "agent-1" });

    expect(res.success).toBe(false);
    expect(sendClaimDossierEmail).not.toHaveBeenCalled();
  });

  it("réutilise le token existant s'il est encore valide", async () => {
    vi.mocked(parcoursRepo.findById).mockResolvedValue(baseParcours as never);
    vi.mocked(userRepo.findById).mockResolvedValue(baseStub as never);

    const res = await renvoyerInvitationClaim({ parcoursId: PARCOURS_ID, agentId: "agent-1" });

    expect(res.success).toBe(true);
    expect(userRepo.setClaimToken).not.toHaveBeenCalled();
    expect(sendClaimDossierEmail).toHaveBeenCalledWith(
      expect.objectContaining({ claimUrl: "https://app.test/claim-dossier/OLD_TOKEN" })
    );
  });

  it("régénère le token s'il a expiré", async () => {
    vi.mocked(parcoursRepo.findById).mockResolvedValue(baseParcours as never);
    vi.mocked(userRepo.findById).mockResolvedValue({ ...baseStub, claimTokenExpiresAt: PAST } as never);

    const res = await renvoyerInvitationClaim({ parcoursId: PARCOURS_ID, agentId: "agent-1" });

    expect(res.success).toBe(true);
    expect(userRepo.setClaimToken).toHaveBeenCalledWith(USER_ID, "NEW_TOKEN", expect.any(Date));
    expect(sendClaimDossierEmail).toHaveBeenCalledWith(
      expect.objectContaining({ claimUrl: "https://app.test/claim-dossier/NEW_TOKEN" })
    );
  });
});
