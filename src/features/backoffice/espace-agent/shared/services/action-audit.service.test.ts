import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/database/repositories", () => ({
  parcoursActionsRepo: { create: vi.fn() },
  agentsRepo: { findById: vi.fn() },
}));
vi.mock("./author-snapshot", () => ({
  buildAuthorSnapshot: vi.fn().mockResolvedValue({
    authorName: "Jean Test",
    authorStructure: "SOLHA Indre",
    authorStructureType: "AMO",
  }),
}));

import { logSystemAction } from "./action-audit.service";
import { parcoursActionsRepo, agentsRepo } from "@/shared/database/repositories";
import { buildAuthorSnapshot } from "./author-snapshot";

const PARCOURS_ID = "11111111-1111-1111-1111-111111111111";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AGENT = { id: "agent-1", givenName: "Jean", usualName: "Test", entrepriseAmoId: "e-1" } as any;

describe("logSystemAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("écrit l'action avec le snapshot auteur de l'agent fourni", async () => {
    const ok = await logSystemAction({
      parcoursId: PARCOURS_ID,
      author: { agent: AGENT },
      actionType: "dossier_archive",
      message: "Ménage injoignable",
    });

    expect(ok).toBe(true);
    expect(agentsRepo.findById).not.toHaveBeenCalled();
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith({
      parcoursId: PARCOURS_ID,
      agentId: "agent-1",
      actionType: "dossier_archive",
      message: "Ménage injoignable",
      authorName: "Jean Test",
      authorStructure: "SOLHA Indre",
      authorStructureType: "AMO",
    });
  });

  it("résout l'agent depuis son id (appel depuis un service ou un script ops)", async () => {
    vi.mocked(agentsRepo.findById).mockResolvedValue(AGENT);

    await logSystemAction({
      parcoursId: PARCOURS_ID,
      author: { agentId: "agent-1" },
      actionType: "av_qualification_eligible",
    });

    expect(agentsRepo.findById).toHaveBeenCalledWith("agent-1");
    expect(buildAuthorSnapshot).toHaveBeenCalledWith(AGENT);
    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: "agent-1", message: null })
    );
  });

  it("écrit une action du demandeur sans agent rattaché", async () => {
    await logSystemAction({
      parcoursId: PARCOURS_ID,
      author: { demandeur: { nom: "Georges Abitbol" } },
      actionType: "accompagnement_arrete",
      message: "Poursuite en autonomie.",
    });

    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: null,
        authorName: "Georges Abitbol",
        authorStructure: null,
        authorStructureType: "DEMANDEUR",
      })
    );
  });

  it("retombe sur « Le demandeur » quand le nom est vide", async () => {
    await logSystemAction({
      parcoursId: PARCOURS_ID,
      author: { demandeur: { nom: "  " } },
      actionType: "accompagnement_arrete",
    });

    expect(parcoursActionsRepo.create).toHaveBeenCalledWith(expect.objectContaining({ authorName: "Le demandeur" }));
  });

  it("n'échoue jamais : une erreur d'écriture est absorbée (best-effort)", async () => {
    vi.mocked(parcoursActionsRepo.create).mockRejectedValueOnce(new Error("db down"));

    await expect(
      logSystemAction({ parcoursId: PARCOURS_ID, author: { agent: AGENT }, actionType: "dossier_archive" })
    ).resolves.toBe(false);
  });

  it("n'écrit rien si l'agent référencé est introuvable", async () => {
    vi.mocked(agentsRepo.findById).mockResolvedValue(null);

    const ok = await logSystemAction({
      parcoursId: PARCOURS_ID,
      author: { agentId: "inconnu" },
      actionType: "dossier_archive",
    });

    expect(ok).toBe(false);
    expect(parcoursActionsRepo.create).not.toHaveBeenCalled();
  });
});
