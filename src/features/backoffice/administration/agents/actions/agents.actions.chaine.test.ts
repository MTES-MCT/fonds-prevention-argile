import { describe, it, expect, vi, beforeEach } from "vitest";

// Session réelle (JWT signé, preuve MFA) et gardes réelles : seuls les cookies et la base sont simulés.
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

vi.mock("@/shared/database", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/database")>()),
  agentsRepo: { findById: vi.fn() },
}));

vi.mock("../services/agents-admin.service", () => ({
  getAllAgentsWithPermissions: vi.fn(),
  getAgentWithPermissions: vi.fn(),
  createAgent: vi.fn(),
  updateAgent: vi.fn(),
  deleteAgent: vi.fn(),
  desactiverAgent: vi.fn(),
  reactiverAgent: vi.fn(),
  getAgentTraces: vi.fn(),
}));

import { cookies } from "next/headers";
import { createToken } from "@/features/auth/utils/jwt.utils";
import { AUTH_METHODS, COOKIE_NAMES } from "@/features/auth/domain/value-objects/constants";
import { agentsRepo } from "@/shared/database";
import { UserRole, type AgentRole } from "@/shared/domain/value-objects/user-role.enum";
import type { Agent } from "@/shared/database/schema/agents";
import { createMockAgentWithPermissions } from "@/shared/testing/mocks";
import { getAllAmos } from "@/features/parcours/amo/actions/amo-disponibles.actions";
import * as agentsAdminService from "../services/agents-admin.service";
import { createAgentAction } from "./agents.actions";

function poserSession(role: UserRole) {
  const jeton = createToken({
    userId: "agent-123",
    role,
    authMethod: AUTH_METHODS.PROCONNECT,
    proConnectAcr: "eidas1-mfa",
    exp: Date.now() + 3600000,
    iat: Date.now(),
  });
  vi.mocked(cookies).mockResolvedValue({
    get: (nom: string) => (nom === COOKIE_NAMES.SESSION ? { value: jeton } : undefined),
  } as never);
}

function agentEnBase(role: AgentRole, desactiveAt: Date | null = null): Agent {
  return { ...createMockAgentWithPermissions().agent, id: "agent-123", role, desactiveAt, desactivePar: null };
}

const NOUVEL_AGENT = {
  email: "nouvel.agent@exemple.fr",
  givenName: "Nouvel",
  role: UserRole.ADMINISTRATEUR as AgentRole,
};

describe("Gardes admin — le rôle est relu en base, jamais dans le JWT", () => {
  beforeEach(() => vi.clearAllMocks());

  it("laisse passer un super-admin toujours super-admin en base", async () => {
    poserSession(UserRole.SUPER_ADMINISTRATEUR);
    vi.mocked(agentsRepo.findById).mockResolvedValue(agentEnBase(UserRole.SUPER_ADMINISTRATEUR));

    await createAgentAction(NOUVEL_AGENT);

    expect(agentsAdminService.createAgent).toHaveBeenCalled();
  });

  it.each([
    ["désactivé", agentEnBase(UserRole.SUPER_ADMINISTRATEUR, new Date())],
    ["rétrogradé administrateur", agentEnBase(UserRole.ADMINISTRATEUR)],
    ["supprimé", null],
  ])("refuse un super-admin %s dont la session est encore ouverte", async (_cas, agent) => {
    poserSession(UserRole.SUPER_ADMINISTRATEUR);
    vi.mocked(agentsRepo.findById).mockResolvedValue(agent);

    const result = await createAgentAction(NOUVEL_AGENT);

    expect(result.success).toBe(false);
    expect(agentsAdminService.createAgent).not.toHaveBeenCalled();
  });

  it("refuse la liste des AMO à un administrateur rétrogradé AMO", async () => {
    poserSession(UserRole.ADMINISTRATEUR);
    vi.mocked(agentsRepo.findById).mockResolvedValue(agentEnBase(UserRole.AMO));

    const result = await getAllAmos();

    expect(result.success).toBe(false);
  });
});
