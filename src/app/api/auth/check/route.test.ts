import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("@/features/auth", () => ({
  AUTH_METHODS: { FRANCECONNECT: "franceconnect", PROCONNECT: "proconnect" },
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
}));
vi.mock("@/shared/database", () => ({
  userRepo: { findById: vi.fn() },
  agentPermissionsRepository: { getDepartementsByAgentId: vi.fn(async () => []) },
}));
vi.mock("@/shared/database/repositories", () => ({ agentsRepo: { findById: vi.fn() } }));

import { getCurrentUser, isAuthenticated } from "@/features/auth";
import { userRepo } from "@/shared/database";
import { agentsRepo } from "@/shared/database/repositories";
import { GET } from "./route";

const NON_CONNECTE = { authenticated: false, user: null };

describe("GET /api/auth/check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sans session → « non connecté », sans lire la base", async () => {
    vi.mocked(isAuthenticated).mockResolvedValue(false);

    expect(await (await GET()).json()).toEqual(NON_CONNECTE);
    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(agentsRepo.findById).not.toHaveBeenCalled();
  });

  // Agent désactivé, supprimé ou sans rôle : getCurrentUser le refuse alors que le cookie existe encore.
  it("session ouverte mais compte refusé → « non connecté », sans lire la base", async () => {
    vi.mocked(isAuthenticated).mockResolvedValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    expect(await (await GET()).json()).toEqual(NON_CONNECTE);
    expect(agentsRepo.findById).not.toHaveBeenCalled();
  });

  it("demandeur connecté → ses seuls champs d'identité, rien d'autre de sa ligne en base", async () => {
    vi.mocked(isAuthenticated).mockResolvedValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "u1",
      firstName: "Camille",
      lastName: "Martin",
      role: UserRole.PARTICULIER,
      authMethod: "franceconnect",
    } as never);
    vi.mocked(userRepo.findById).mockResolvedValue({
      id: "u1",
      email: "camille@example.test",
      fcId: "sub-franceconnect",
      claimToken: "jeton-secret",
      telephone: "0600000000",
    } as never);

    const { user } = await (await GET()).json();

    expect(Object.keys(user).sort()).toEqual(["authMethod", "email", "firstName", "id", "lastName", "role"]);
    expect(userRepo.findById).toHaveBeenCalledWith("u1");
  });

  it("erreur interne → « non connecté », sans détail de l'erreur", async () => {
    vi.mocked(isAuthenticated).mockRejectedValue(new Error("connexion base refusée : mot de passe"));

    expect(await (await GET()).json()).toEqual(NON_CONNECTE);
  });
});
