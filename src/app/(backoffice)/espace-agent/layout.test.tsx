import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

// redirect() de Next lève (NEXT_REDIRECT) : on le simule pour stopper l'exécution.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service", () => ({
  evaluerAccesEspaceAgent: vi.fn(),
}));

// Stubs identifiables pour les écrans de refus
vi.mock("@/shared/components", () => ({
  AccesNonAutoriseAmo: function AccesNonAutoriseAmo() {
    return null;
  },
  AccesNonAutoriseAgentNonEnregistre: function AccesNonAutoriseAgentNonEnregistre() {
    return null;
  },
}));
vi.mock("./components/SuperAdminReadOnlyBanner", () => ({
  default: function SuperAdminReadOnlyBanner() {
    return null;
  },
}));

import EspaceAgentLayout from "./layout";
import { evaluerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { AccesNonAutoriseAmo, AccesNonAutoriseAgentNonEnregistre } from "@/shared/components";
import SuperAdminReadOnlyBanner from "./components/SuperAdminReadOnlyBanner";

const render = () => EspaceAgentLayout({ children: "contenu" });

function acces(value: unknown) {
  vi.mocked(evaluerAccesEspaceAgent).mockResolvedValue(value as never);
}

describe("EspaceAgentLayout — affichage selon le verdict d'accès (§7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("non authentifié → redirige vers la connexion agent", async () => {
    acces({ statut: "non_connecte" });
    await expect(render()).rejects.toThrow("REDIRECT:/connexion/agent");
  });

  it("ANALYSTE national → redirige vers /administration", async () => {
    acces({ statut: "analyste_national" });
    await expect(render()).rejects.toThrow("REDIRECT:/administration");
  });

  it("connecté en FranceConnect → écran accès non autorisé", async () => {
    acces({ statut: "methode_invalide" });
    expect((await render()).type).toBe(AccesNonAutoriseAmo);
  });

  it("agent non enregistré en BDD → écran agent non enregistré", async () => {
    acces({ statut: "agent_inconnu" });
    expect((await render()).type).toBe(AccesNonAutoriseAgentNonEnregistre);
  });

  it("rôle non habilité → écran accès non autorisé", async () => {
    acces({ statut: "role_refuse" });
    expect((await render()).type).toBe(AccesNonAutoriseAmo);
  });

  it("agent autorisé → rend le contenu, sans bandeau lecture seule", async () => {
    acces({ statut: "autorise", agent: { id: "agent-1", role: UserRole.AMO } });

    const result = await render();

    expect(result.type).toBe("div");
    expect(result.props.children[0]).toBe(false);
    expect(result.props.children[1]).toBe("contenu");
  });

  it("super-admin → bandeau lecture seule", async () => {
    acces({ statut: "autorise", agent: { id: "agent-1", role: UserRole.SUPER_ADMINISTRATEUR } });

    const result = await render();

    expect(result.props.children[0].type).toBe(SuperAdminReadOnlyBanner);
  });
});
