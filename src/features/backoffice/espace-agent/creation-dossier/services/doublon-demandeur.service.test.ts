import { describe, it, expect, vi, beforeEach } from "vitest";

const validationEnBase = vi.hoisted(() => ({ entrepriseAmoId: "amo-1" as string | null }));

vi.mock("@/shared/database/client", () => ({
  db: {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => [{ entrepriseAmoId: validationEnBase.entrepriseAmoId }] }) }),
    }),
  },
}));
vi.mock("@/features/auth/permissions/services/agent-scope.service", () => ({
  verifyProspectTerritoryAccess: vi.fn(),
}));
vi.mock("@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service", () => ({
  resolveEspaceAgentPath: vi.fn(),
}));

import { UserRole } from "@/shared/domain/value-objects";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import { resolveEspaceAgentPath } from "@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service";
import { presenterDoublonPourAgent } from "./doublon-demandeur.service";

const amo = { id: "agent-1", role: UserRole.AMO, entrepriseAmoId: "amo-1", allersVersId: null };
const doublon = { motif: "compte" as const, parcoursId: "p-1" };

describe("presenterDoublonPourAgent — lien vers le dossier existant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validationEnBase.entrepriseAmoId = "amo-1";
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue(null);
  });

  it("ne donne aucun lien hors du territoire de l'agent", async () => {
    vi.mocked(verifyProspectTerritoryAccess).mockResolvedValue("Ce prospect n'est pas dans votre territoire");

    const resultat = await presenterDoublonPourAgent(doublon, amo);

    expect(resultat.lien).toBeNull();
    expect(resolveEspaceAgentPath).not.toHaveBeenCalled();
  });

  it("donne le lien d'un dossier ou d'un prospect du territoire", async () => {
    vi.mocked(resolveEspaceAgentPath).mockResolvedValue("/espace-agent/prospects/p-1");

    expect((await presenterDoublonPourAgent(doublon, amo)).lien).toBe("/espace-agent/prospects/p-1");
  });

  it("réserve le lien d'une demande en attente à l'AMO sollicitée", async () => {
    vi.mocked(resolveEspaceAgentPath).mockResolvedValue("/espace-agent/demandes/v-1");

    expect((await presenterDoublonPourAgent(doublon, amo)).lien).toBe("/espace-agent/demandes/v-1");

    validationEnBase.entrepriseAmoId = "amo-2";
    expect((await presenterDoublonPourAgent(doublon, amo)).lien).toBeNull();

    const allerVers = { ...amo, role: UserRole.ALLERS_VERS, entrepriseAmoId: null, allersVersId: "av-1" };
    expect((await presenterDoublonPourAgent(doublon, allerVers)).lien).toBeNull();
  });

  it("ne donne pas de lien à un compte sans parcours", async () => {
    const resultat = await presenterDoublonPourAgent({ motif: "compte", parcoursId: null }, amo);

    expect(resultat.lien).toBeNull();
    expect(verifyProspectTerritoryAccess).not.toHaveBeenCalled();
  });
});
