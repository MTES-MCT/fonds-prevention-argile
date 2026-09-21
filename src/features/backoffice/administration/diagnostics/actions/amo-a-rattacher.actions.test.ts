import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/features/parcours/amo/services/rattachement-amo.service", () => ({ rattacherAmo: vi.fn() }));
vi.mock("@/features/backoffice/administration/diagnostics/services/amo-a-rattacher.service", () => ({
  listerDossiersARattacher: vi.fn(),
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/action-audit.service", () => ({
  logSystemAction: vi.fn(),
}));

import { listerDossiersARattacherAction, rattacherAmoAction } from "./amo-a-rattacher.actions";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { rattacherAmo } from "@/features/parcours/amo/services/rattachement-amo.service";
import { listerDossiersARattacher } from "@/features/backoffice/administration/diagnostics/services/amo-a-rattacher.service";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";

const PARCOURS_ID = "11111111-1111-1111-1111-111111111111";

function mockAgent(role: UserRole) {
  vi.mocked(getCurrentAgent).mockResolvedValue({
    success: true,
    data: { id: "agent-1", role, entrepriseAmoId: null, allersVersId: null },
  } as never);
}

describe("file « AMO à rattacher » — accès", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listerDossiersARattacher).mockResolvedValue([]);
    vi.mocked(rattacherAmo).mockResolvedValue({
      success: true,
      data: { entrepriseAmoId: "e1", amoNom: "Soliha 36", origine: "audit" },
    });
  });

  it.each([UserRole.ADMINISTRATEUR, UserRole.ANALYSTE, UserRole.AMO, UserRole.ALLERS_VERS])(
    "refuse la lecture à %s : la file expose des noms de demandeurs",
    async (role) => {
      mockAgent(role);

      const result = await listerDossiersARattacherAction();

      expect(result.success).toBe(false);
      expect(listerDossiersARattacher).not.toHaveBeenCalled();
    }
  );

  it.each([UserRole.ADMINISTRATEUR, UserRole.AMO])("refuse le rattachement à %s", async (role) => {
    mockAgent(role);

    const result = await rattacherAmoAction(PARCOURS_ID);

    expect(result.success).toBe(false);
    expect(rattacherAmo).not.toHaveBeenCalled();
  });

  it("autorise le super-admin et trace la décision", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);

    const result = await rattacherAmoAction(PARCOURS_ID);

    expect(result.success).toBe(true);
    expect(rattacherAmo).toHaveBeenCalledWith({ parcoursId: PARCOURS_ID });
    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({ parcoursId: PARCOURS_ID, actionType: "amo_rattachee" })
    );
  });

  it("ne trace rien si le service refuse (dossier gelé, déjà rattaché…)", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    vi.mocked(rattacherAmo).mockResolvedValue({ success: false, error: "Formulaire d'éligibilité déposé" });

    const result = await rattacherAmoAction(PARCOURS_ID);

    expect(result.success).toBe(false);
    expect(logSystemAction).not.toHaveBeenCalled();
  });
});
