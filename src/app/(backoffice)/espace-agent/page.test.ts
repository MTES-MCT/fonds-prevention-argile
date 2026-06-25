import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import * as userService from "@/features/auth/services/user.service";
import EspaceAgentHomePage from "./page";

// redirect() de Next lève en réalité (NEXT_REDIRECT) : on le simule pour que
// l'exécution s'arrête au premier appel, comme en production.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));

function mockUser(role: UserRole | null) {
  vi.mocked(userService.getCurrentUser).mockResolvedValue(role ? ({ role } as never) : (null as never));
}

describe("EspaceAgentHomePage — redirections par rôle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige un ANALYSTE vers le listing des dossiers (suivi DDT départemental)", async () => {
    mockUser(UserRole.ANALYSTE);
    await expect(EspaceAgentHomePage()).rejects.toThrow("REDIRECT:/espace-agent/dossiers");
  });

  it("redirige un AMO vers le listing des dossiers (non-régression)", async () => {
    mockUser(UserRole.AMO);
    await expect(EspaceAgentHomePage()).rejects.toThrow("REDIRECT:/espace-agent/dossiers");
  });

  it("renvoie un rôle non-agent vers access-denied", async () => {
    mockUser(UserRole.PARTICULIER);
    await expect(EspaceAgentHomePage()).rejects.toThrow("REDIRECT:/backoffice/access-denied");
  });

  it("renvoie un visiteur non connecté vers la connexion agent", async () => {
    mockUser(null);
    await expect(EspaceAgentHomePage()).rejects.toThrow("REDIRECT:/connexion/agent");
  });
});
