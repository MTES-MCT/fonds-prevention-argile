import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({ parcoursActionsRepo: { create: vi.fn() } }));
vi.mock("@/features/parcours/dossiers-ds/services/regeneration.service", () => ({
  reinitialiserDossierEtape: vi.fn(),
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/author-snapshot", () => ({
  buildAuthorSnapshot: vi.fn().mockResolvedValue({ authorName: "A", authorStructure: "S", authorStructureType: "AMO" }),
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/dossier-dn-permissions.service", () => ({
  verifierAccesDossierDn: vi.fn(),
}));

import { reinitialiserDossierDnAction } from "./reinitialiser-dossier-dn.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { reinitialiserDossierEtape } from "@/features/parcours/dossiers-ds/services/regeneration.service";
import { verifierAccesDossierDn } from "@/features/backoffice/espace-agent/shared/services/dossier-dn-permissions.service";
import { parcoursActionsRepo } from "@/shared/database/repositories";

const PARCOURS = "11111111-1111-1111-1111-111111111111";

function mockAgent(role: UserRole) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: { id: "agent-1", role } as any });
}

describe("reinitialiserDossierDnAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifierAccesDossierDn).mockResolvedValue(null);
    vi.mocked(reinitialiserDossierEtape).mockResolvedValue({ success: true, data: { statut: "a_recreer" } });
  });

  it("refuse quand la garde de périmètre refuse, sans rien réinitialiser", async () => {
    mockAgent(UserRole.AMO);
    vi.mocked(verifierAccesDossierDn).mockResolvedValue("Ce dossier appartient à une autre entreprise AMO.");

    const result = await reinitialiserDossierDnAction(PARCOURS, Step.ELIGIBILITE);

    expect(result.success).toBe(false);
    expect(reinitialiserDossierEtape).not.toHaveBeenCalled();
  });

  it("réinitialise et trace l'action quand l'accès est accordé", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);

    const result = await reinitialiserDossierDnAction(PARCOURS, Step.ELIGIBILITE);

    expect(result.success).toBe(true);
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ parcoursId: PARCOURS, actionType: "dossier_dn_reinitialise" })
    );
  });

  // Le service rattache au lieu de recréer si un ancien numéro a été déposé entre-temps :
  // l'audit doit dire ce qui s'est réellement passé, pas ce qu'on avait demandé.
  it("trace un rattachement quand un ancien numéro avait été déposé", async () => {
    mockAgent(UserRole.AMO);
    vi.mocked(reinitialiserDossierEtape).mockResolvedValue({
      success: true,
      data: { statut: "rattache", dsNumber: "32052358" },
    });

    const result = await reinitialiserDossierDnAction(PARCOURS, Step.ELIGIBILITE);

    expect(result.success).toBe(true);
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("32052358") })
    );
  });

  it("remonte le refus du service sans écrire d'audit", async () => {
    mockAgent(UserRole.AMO);
    vi.mocked(reinitialiserDossierEtape).mockResolvedValue({
      success: false,
      error: "Votre dossier a déjà été transmis : votre lien pointe vers le dossier déposé.",
    });

    const result = await reinitialiserDossierDnAction(PARCOURS, Step.ELIGIBILITE);

    expect(result.success).toBe(false);
    expect(parcoursActionsRepo.create).not.toHaveBeenCalled();
  });
});
