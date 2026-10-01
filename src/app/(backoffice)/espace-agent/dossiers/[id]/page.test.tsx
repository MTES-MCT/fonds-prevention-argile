import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service", () => ({
  exigerAccesEspaceAgent: vi.fn(),
}));
vi.mock("@/features/backoffice/espace-agent/dossiers/services/dossier-detail.service", () => ({
  getDossierDetail: vi.fn(),
}));
vi.mock("@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service", () => ({
  resolveEspaceAgentPath: vi.fn(),
}));
vi.mock("@/features/parcours/dossiers-ds/services/pieces-justificatives.service", () => ({
  getPiecesJustificativesForStep: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/features/backoffice/espace-agent/prospects/services/qualification.service", () => ({
  qualificationService: { getByParcoursId: vi.fn() },
}));
// Le menu « Gérer » tire l'action de rattachement DN, dont le client GraphQL lit l'env à
// la construction du singleton — inutile pour tester le routage de la page.
vi.mock("@/features/parcours/dossiers-ds/adapters/graphql/client", () => ({
  graphqlClient: { getDossierStatus: vi.fn(), getDemarcheDossiers: vi.fn() },
}));
// Même raison côté REST : l'action d'initiation tire le client de préremplissage.
vi.mock("@/features/parcours/dossiers-ds/adapters/rest/client", () => ({ prefillClient: {} }));
vi.mock("@/shared/database/repositories/agents.repository", () => ({ agentsRepository: {} }));
vi.mock("@/shared/database/repositories/allers-vers.repository", () => ({ allersVersRepository: {} }));

import DossierDetailPage from "./page";
import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { getDossierDetail } from "@/features/backoffice/espace-agent/dossiers/services/dossier-detail.service";
import { resolveEspaceAgentPath } from "@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service";

const PARCOURS_ID = "11111111-1111-4111-8111-111111111111";
const VALIDATION_ID = "22222222-2222-4222-8222-222222222222";

const render = (id: string) => DossierDetailPage({ params: Promise.resolve({ id }) });

/**
 * Permalien parcoursId (annotations DN, Brevo) : la page doit résoudre la cible réelle
 * au clic. Le contrôle d'accès reste celui de la page cible — on vérifie ici qu'aucune
 * donnée de dossier ne transite par la résolution.
 */
describe("DossierDetailPage — résolution du permalien", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exigerAccesEspaceAgent).mockResolvedValue({ id: "agent-1" } as never);
  });

  it("non authentifié → redirige vers la connexion agent, sans rien résoudre", async () => {
    vi.mocked(exigerAccesEspaceAgent).mockRejectedValue(new Error("REDIRECT:/connexion/agent"));

    await expect(render(PARCOURS_ID)).rejects.toThrow("REDIRECT:/connexion/agent");
    expect(getDossierDetail).not.toHaveBeenCalled();
    expect(resolveEspaceAgentPath).not.toHaveBeenCalled();
  });

  // Next rend la page même quand le layout affiche un refus : elle ne doit charger aucune donnée.
  it("rôle refusé par l'espace agent (ex. ADMINISTRATEUR) → 404 sans lire le dossier", async () => {
    vi.mocked(exigerAccesEspaceAgent).mockRejectedValue(new Error("NOT_FOUND"));

    await expect(render(VALIDATION_ID)).rejects.toThrow("NOT_FOUND");
    expect(getDossierDetail).not.toHaveBeenCalled();
  });

  it("id de validation valide → aucune résolution déclenchée", async () => {
    vi.mocked(getDossierDetail).mockResolvedValue({ success: false, error: "Non authentifié" } as never);
    vi.mocked(resolveEspaceAgentPath).mockResolvedValue(null);

    await expect(render(VALIDATION_ID)).rejects.toThrow("NOT_FOUND");
  });

  it("permalien parcoursId → redirige vers la page dossier de la validation", async () => {
    vi.mocked(getDossierDetail).mockResolvedValue({ success: false, error: "Dossier non trouvé" } as never);
    vi.mocked(resolveEspaceAgentPath).mockResolvedValue(`/espace-agent/dossiers/${VALIDATION_ID}`);

    await expect(render(PARCOURS_ID)).rejects.toThrow(`REDIRECT:/espace-agent/dossiers/${VALIDATION_ID}`);
  });

  it("permalien d'un parcours sans validation → redirige vers la page prospect", async () => {
    vi.mocked(getDossierDetail).mockResolvedValue({ success: false, error: "Dossier non trouvé" } as never);
    vi.mocked(resolveEspaceAgentPath).mockResolvedValue(`/espace-agent/prospects/${PARCOURS_ID}`);

    await expect(render(PARCOURS_ID)).rejects.toThrow(`REDIRECT:/espace-agent/prospects/${PARCOURS_ID}`);
  });

  it("id inconnu → 404", async () => {
    vi.mocked(getDossierDetail).mockResolvedValue({ success: false, error: "Dossier non trouvé" } as never);
    vi.mocked(resolveEspaceAgentPath).mockResolvedValue(null);

    await expect(render(PARCOURS_ID)).rejects.toThrow("NOT_FOUND");
  });

  // Un dossier refusé par la garde territoriale ne doit pas se rattraper par la
  // résolution : sinon le permalien deviendrait un contournement du scope agent.
  it("accès refusé sur un id de validation → 404, jamais de redirection", async () => {
    vi.mocked(getDossierDetail).mockResolvedValue({ success: false, error: "Accès non autorisé" } as never);
    vi.mocked(resolveEspaceAgentPath).mockResolvedValue(null);

    await expect(render(VALIDATION_ID)).rejects.toThrow("NOT_FOUND");
    // La résolution ne connaît que les parcours : sur un id de validation elle rend null.
    expect(resolveEspaceAgentPath).toHaveBeenCalledWith(VALIDATION_ID);
  });

  it("ne boucle pas si la résolution renvoie le chemin courant", async () => {
    vi.mocked(getDossierDetail).mockResolvedValue({ success: false, error: "Dossier non trouvé" } as never);
    vi.mocked(resolveEspaceAgentPath).mockResolvedValue(`/espace-agent/dossiers/${PARCOURS_ID}`);

    await expect(render(PARCOURS_ID)).rejects.toThrow("NOT_FOUND");
  });
});
