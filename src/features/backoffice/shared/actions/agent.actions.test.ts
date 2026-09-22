import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/auth/services/session.service", () => ({ getSession: vi.fn() }));
vi.mock("../services/agent.service", () => ({ getAgentById: vi.fn() }));

import { getCurrentAgent } from "./agent.actions";
import { getCurrentUser } from "@/features/auth/services/user.service";

const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe("getCurrentAgent — signaux de contrôle Next", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Un ActionResult en échec ferait prérendre la page espace-agent en « pas d'agent »,
  // donc figée en redirection statique (cf. CLAUDE.md, gotcha DYNAMIC_SERVER_USAGE).
  it("relance l'usage dynamique de cookies() au lieu de le convertir en échec", async () => {
    const dynamique = Object.assign(new Error("Dynamic server usage: cookies"), {
      digest: "DYNAMIC_SERVER_USAGE",
    });
    mockGetCurrentUser.mockRejectedValue(dynamique);

    await expect(getCurrentAgent()).rejects.toBe(dynamique);
  });

  it("relance une redirection Next", async () => {
    const redirection = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT;replace;/connexion/agent;307;",
    });
    mockGetCurrentUser.mockRejectedValue(redirection);

    await expect(getCurrentAgent()).rejects.toBe(redirection);
  });

  it("convertit encore une vraie panne en échec", async () => {
    mockGetCurrentUser.mockRejectedValue(new Error("connexion BDD perdue"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const resultat = await getCurrentAgent();

    expect(resultat).toEqual({
      success: false,
      error: "Erreur lors de la récupération de l'agent",
    });
    spy.mockRestore();
  });
});
