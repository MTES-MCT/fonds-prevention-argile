import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service", () => ({
  refusAccesEspaceAgent: vi.fn(),
}));
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("../services/doublon-demandeur.service", () => ({
  detecterDoublonDemandeur: vi.fn(),
  presenterDoublonPourAgent: vi.fn(),
}));

import { UserRole } from "@/shared/domain/value-objects";
import type { AuthUser } from "@/features/auth/domain/entities";
import { refusAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { detecterDoublonDemandeur, presenterDoublonPourAgent } from "../services/doublon-demandeur.service";
import { presenterDoublon } from "../domain/doublon";
import { verifierEmailDemandeurAction } from "./verifier-doublon-demandeur.action";

const agent = (role: UserRole): AuthUser => ({
  id: "user-1",
  role,
  agentId: "agent-1",
  entrepriseAmoId: "amo-1",
  authMethod: "proconnect",
  loginTime: new Date().toISOString(),
  firstName: "Test",
  lastName: "Agent",
});

describe("verifierEmailDemandeurAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(refusAccesEspaceAgent).mockResolvedValue(null);
    vi.mocked(getCurrentUser).mockResolvedValue(agent(UserRole.AMO));
  });

  it("refuse hors espace agent, sans chercher", async () => {
    vi.mocked(refusAccesEspaceAgent).mockResolvedValue("Accès refusé");

    const result = await verifierEmailDemandeurAction("jean@example.com");

    expect(result.success).toBe(false);
    expect(detecterDoublonDemandeur).not.toHaveBeenCalled();
  });

  it("refuse un rôle qui ne crée pas de dossier", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(agent(UserRole.ANALYSTE));

    const result = await verifierEmailDemandeurAction("jean@example.com");

    expect(result).toEqual({ success: false, error: "Permission refusée" });
    expect(detecterDoublonDemandeur).not.toHaveBeenCalled();
  });

  it("refuse un email invalide", async () => {
    const result = await verifierEmailDemandeurAction("pas-un-email");

    expect(result.success).toBe(false);
    expect(detecterDoublonDemandeur).not.toHaveBeenCalled();
  });

  it("ne cherche que par email, et signale le compte existant", async () => {
    vi.mocked(detecterDoublonDemandeur).mockResolvedValue({ motif: "compte", parcoursId: "p-1" });
    vi.mocked(presenterDoublonPourAgent).mockResolvedValue(presenterDoublon("compte", null));

    const result = await verifierEmailDemandeurAction(" Jean@Example.com ");

    expect(detecterDoublonDemandeur).toHaveBeenCalledWith({ email: "Jean@Example.com" });
    expect(result.success && result.data?.motif).toBe("compte");
  });

  it("laisse passer un email inconnu", async () => {
    vi.mocked(detecterDoublonDemandeur).mockResolvedValue(null);

    expect(await verifierEmailDemandeurAction("jean@example.com")).toEqual({ success: true, data: null });
  });
});
