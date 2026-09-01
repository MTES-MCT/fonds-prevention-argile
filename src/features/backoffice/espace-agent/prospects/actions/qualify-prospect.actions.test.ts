import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/services/user.service", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/features/auth/permissions/services/rbac.service", () => ({ hasPermission: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/super-admin-access", () => ({
  assertNotSuperAdminReadOnly: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/features/auth/permissions/services/responsable-permissions.service", () => ({
  assertCanActAsResponsable: vi.fn(),
}));
vi.mock("../services/qualification.service", () => ({
  qualificationService: { qualifyProspect: vi.fn(), getLatestQualification: vi.fn() },
}));

import { qualifyProspectAction } from "./qualify-prospect.actions";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { assertCanActAsResponsable } from "@/features/auth/permissions/services/responsable-permissions.service";
import { qualificationService } from "../services/qualification.service";
import { QualificationDecision } from "../domain/types";

const PARCOURS_ID = "11111111-1111-4111-8111-111111111111";

function mockAgentAllersVers(overrides: Record<string, unknown> = {}) {
  vi.mocked(getCurrentUser).mockResolvedValue({
    agentId: "agent-1",
    role: UserRole.ALLERS_VERS,
    entrepriseAmoId: null,
    allersVersId: "av-1",
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

const payloadEligible = {
  parcoursId: PARCOURS_ID,
  decision: QualificationDecision.ELIGIBLE,
  estMandataireFinancier: true,
  note: "Visite faite",
};

describe("qualifyProspectAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue(null);
    vi.mocked(hasPermission).mockReturnValue(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(assertCanActAsResponsable).mockResolvedValue({ ok: true } as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(qualificationService.qualifyProspect).mockResolvedValue({ id: "qualif-1" } as any);
    mockAgentAllersVers();
  });

  describe("gardes", () => {
    it("refuse un super-administrateur en lecture seule", async () => {
      vi.mocked(assertNotSuperAdminReadOnly).mockResolvedValue("Lecture seule");

      const result = await qualifyProspectAction(payloadEligible);

      expect(result).toEqual({ success: false, error: "Lecture seule" });
      expect(qualificationService.qualifyProspect).not.toHaveBeenCalled();
    });

    it("refuse un utilisateur non authentifié", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const result = await qualifyProspectAction(payloadEligible);

      expect(result).toEqual({ success: false, error: "Non authentifié" });
      expect(qualificationService.qualifyProspect).not.toHaveBeenCalled();
    });

    it("refuse un rôle sans la permission de voir les prospects", async () => {
      vi.mocked(hasPermission).mockReturnValue(false);

      const result = await qualifyProspectAction(payloadEligible);

      expect(result).toEqual({ success: false, error: "Permission refusée" });
      expect(qualificationService.qualifyProspect).not.toHaveBeenCalled();
    });

    it("refuse un agent sans structure Aller-vers rattachée", async () => {
      mockAgentAllersVers({ allersVersId: null });

      const result = await qualifyProspectAction(payloadEligible);

      expect(result.success).toBe(false);
      expect(qualificationService.qualifyProspect).not.toHaveBeenCalled();
    });

    it("refuse un agent qui n'est pas responsable du dossier", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked(assertCanActAsResponsable).mockResolvedValue({ ok: false, error: "Non responsable" } as any);

      const result = await qualifyProspectAction(payloadEligible);

      expect(result).toEqual({ success: false, error: "Non responsable" });
      expect(qualificationService.qualifyProspect).not.toHaveBeenCalled();
    });
  });

  describe("validation des entrées", () => {
    it("refuse un parcoursId qui n'est pas un UUID, sans message technique anglais", async () => {
      const result = await qualifyProspectAction({ ...payloadEligible, parcoursId: "pas-un-uuid" });

      expect(result).toEqual({ success: false, error: "Données invalides" });
      expect(qualificationService.qualifyProspect).not.toHaveBeenCalled();
    });

    it("refuse un UUID non conforme à la RFC (variante invalide)", async () => {
      // Piège rencontré en QA : Zod 4 valide la RFC 4122, les ids « lisibles » sont refusés.
      const result = await qualifyProspectAction({
        ...payloadEligible,
        parcoursId: "22222222-2222-2222-2222-222222222c20",
      });

      expect(result).toEqual({ success: false, error: "Données invalides" });
    });

    it("refuse une décision inconnue", async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await qualifyProspectAction({ ...payloadEligible, decision: "peut_etre" as any });

      expect(result).toEqual({ success: false, error: "Données invalides" });
    });

    it("remonte le message métier en français quand « non éligible » n'a aucune raison", async () => {
      const result = await qualifyProspectAction({
        parcoursId: PARCOURS_ID,
        decision: QualificationDecision.NON_ELIGIBLE,
        raisonsIneligibilite: [],
      });

      expect(result).toEqual({ success: false, error: "Au moins une raison d'inéligibilité est requise" });
      expect(qualificationService.qualifyProspect).not.toHaveBeenCalled();
    });
  });

  describe("délégation au service", () => {
    it("transmet la décision, le mandataire et la note", async () => {
      const result = await qualifyProspectAction(payloadEligible);

      expect(result.success).toBe(true);
      expect(qualificationService.qualifyProspect).toHaveBeenCalledWith({
        parcoursId: PARCOURS_ID,
        agentId: "agent-1",
        decision: QualificationDecision.ELIGIBLE,
        actionsRealisees: undefined,
        raisonsIneligibilite: undefined,
        estMandataireFinancier: true,
        note: "Visite faite",
      });
    });

    it("transmet les raisons d'inéligibilité", async () => {
      await qualifyProspectAction({
        parcoursId: PARCOURS_ID,
        decision: QualificationDecision.NON_ELIGIBLE,
        raisonsIneligibilite: ["appartement", "autre:sinistre non RGA"],
      });

      expect(qualificationService.qualifyProspect).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: QualificationDecision.NON_ELIGIBLE,
          raisonsIneligibilite: ["appartement", "autre:sinistre non RGA"],
        })
      );
    });
  });
});
