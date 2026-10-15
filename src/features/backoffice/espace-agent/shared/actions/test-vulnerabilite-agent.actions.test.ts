import { beforeEach, describe, expect, it, vi } from "vitest";
import { parcoursRepo } from "@/shared/database/repositories";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { refusAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { creerSimulationVulnerabilite } from "@/features/vulnerabilite-rga/services/creer-simulation.service";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { logSystemAction } from "../services/action-audit.service";
import { resoudreDossierTestVulnerabilite } from "../services/test-vulnerabilite-agent.service";
import { enregistrerTestVulnerabiliteAgentAction } from "./test-vulnerabilite-agent.actions";

vi.mock("@/shared/database/repositories", () => ({ parcoursRepo: { update: vi.fn() } }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({ assertNotSuperAdminReadOnly: vi.fn() }));
vi.mock("@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service", () => ({
  refusAccesEspaceAgent: vi.fn(),
}));
vi.mock("@/features/vulnerabilite-rga/services/creer-simulation.service", () => ({
  creerSimulationVulnerabilite: vi.fn(),
}));
vi.mock("@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite", () => ({
  isVulnerabiliteRgaActive: vi.fn(),
}));
vi.mock("../services/action-audit.service", () => ({ logSystemAction: vi.fn() }));
vi.mock("../services/test-vulnerabilite-agent.service", () => ({ resoudreDossierTestVulnerabilite: vi.fn() }));

const AGENT = { id: "agent-1", role: "amo" };
const PAYLOAD = { codeDepartement: "36", reponses: { aleaRga: "fort", gouttieres: "absentes_ou_debordantes" } };

describe("enregistrerTestVulnerabiliteAgentAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(refusAccesEspaceAgent).mockResolvedValue(null);
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
    vi.mocked(isVulnerabiliteRgaActive).mockReturnValue(true);
    vi.mocked(getCurrentAgent).mockResolvedValue({ success: true, data: AGENT } as never);
    vi.mocked(resoudreDossierTestVulnerabilite).mockResolvedValue({
      success: true,
      data: { parcoursId: "parcours-1", nomDemandeur: "Angela Dubois", adresse: null },
    });
    vi.mocked(creerSimulationVulnerabilite).mockResolvedValue({ id: "sim-1" } as never);
  });

  it("refuse hors espace agent, sans rien écrire", async () => {
    vi.mocked(refusAccesEspaceAgent).mockResolvedValue("Accès refusé");

    const resultat = await enregistrerTestVulnerabiliteAgentAction("val-1", PAYLOAD);

    expect(resultat).toEqual({ success: false, error: "Accès refusé" });
    expect(creerSimulationVulnerabilite).not.toHaveBeenCalled();
  });

  it("refuse le super-administrateur, en lecture seule", async () => {
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue("Lecture seule");

    expect((await enregistrerTestVulnerabiliteAgentAction("val-1", PAYLOAD)).success).toBe(false);
    expect(creerSimulationVulnerabilite).not.toHaveBeenCalled();
  });

  it("refuse quand la feature est inactive : une Server Action reste appelable même si sa page renvoie 404", async () => {
    vi.mocked(isVulnerabiliteRgaActive).mockReturnValue(false);

    expect((await enregistrerTestVulnerabiliteAgentAction("val-1", PAYLOAD)).success).toBe(false);
    expect(creerSimulationVulnerabilite).not.toHaveBeenCalled();
  });

  it("refuse une charge utile qui n'est pas dans la grille", async () => {
    const resultat = await enregistrerTestVulnerabiliteAgentAction("val-1", {
      codeDepartement: "36",
      reponses: { gouttieres: "réponse inventée" },
    });

    expect(resultat).toEqual({ success: false, error: "Résultat invalide" });
    expect(creerSimulationVulnerabilite).not.toHaveBeenCalled();
  });

  it("n'écrit rien quand l'agent n'a pas accès au dossier", async () => {
    vi.mocked(resoudreDossierTestVulnerabilite).mockResolvedValue({
      success: false,
      error: "Ce dossier ne vous est pas destiné",
    });

    expect((await enregistrerTestVulnerabiliteAgentAction("val-1", PAYLOAD)).success).toBe(false);
    expect(creerSimulationVulnerabilite).not.toHaveBeenCalled();
    expect(parcoursRepo.update).not.toHaveBeenCalled();
  });

  it("rattache le résultat au parcours du dossier et le trace sans en révéler le détail", async () => {
    const resultat = await enregistrerTestVulnerabiliteAgentAction("val-1", PAYLOAD);

    expect(resultat).toEqual({ success: true, data: { parcoursId: "parcours-1" } });
    expect(parcoursRepo.update).toHaveBeenCalledWith("parcours-1", { vulnerabiliteSimulationId: "sim-1" });
    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({
        parcoursId: "parcours-1",
        author: { agent: AGENT },
        actionType: "vulnerabilite_realisee_par_agent",
        message: expect.stringContaining("Résultat :"),
      })
    );
  });
});
