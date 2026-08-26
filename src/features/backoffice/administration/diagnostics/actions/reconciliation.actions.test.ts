import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/backoffice/shared/actions/agent.actions", () => ({ getCurrentAgent: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  dsObservationsRepo: { listerOuvertes: vi.fn(), compterOuvertesParVerdict: vi.fn(), resoudre: vi.fn() },
}));
vi.mock("@/features/parcours/dossiers-ds/services/reconciliation.service", () => ({
  reconcilierDemarche: vi.fn(),
}));
vi.mock("@/features/parcours/dossiers-ds/services/inspection.service", () => ({
  inspecterDossierDn: vi.fn(),
}));
vi.mock("@/features/parcours/dossiers-ds/services/pieces-justificatives.service", () => ({
  resolveDemarcheNumberForStep: vi.fn().mockReturnValue(126061),
}));

import {
  listerFilesReconciliationAction,
  analyserReconciliationAction,
  resoudreObservationAction,
  inspecterDossierDnAction,
} from "./reconciliation.actions";
import { inspecterDossierDn } from "@/features/parcours/dossiers-ds/services/inspection.service";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { dsObservationsRepo } from "@/shared/database/repositories";
import { reconcilierDemarche } from "@/features/parcours/dossiers-ds/services/reconciliation.service";

function mockAgent(role: UserRole) {
  vi.mocked(getCurrentAgent).mockResolvedValue({
    success: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { id: "agent-1", role } as any,
  });
}

// Ces files exposent des numéros de dossier et des noms : réservées au super-admin.
describe("actions de réconciliation — contrôle d'accès", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dsObservationsRepo.listerOuvertes).mockResolvedValue([]);
    vi.mocked(dsObservationsRepo.compterOuvertesParVerdict).mockResolvedValue({});
    vi.mocked(dsObservationsRepo.resoudre).mockResolvedValue(undefined);
  });

  it("refuse la lecture des files à un administrateur non super-admin", async () => {
    mockAgent(UserRole.ADMINISTRATEUR);
    const result = await listerFilesReconciliationAction();
    expect(result.success).toBe(false);
    expect(dsObservationsRepo.listerOuvertes).not.toHaveBeenCalled();
  });

  it("refuse l'analyse à un AMO", async () => {
    mockAgent(UserRole.AMO);
    const result = await analyserReconciliationAction(Step.ELIGIBILITE);
    expect(result.success).toBe(false);
    expect(reconcilierDemarche).not.toHaveBeenCalled();
  });

  it("refuse la résolution à un analyste", async () => {
    mockAgent(UserRole.ANALYSTE);
    const result = await resoudreObservationAction("32052358", "arbitre");
    expect(result.success).toBe(false);
    expect(dsObservationsRepo.resoudre).not.toHaveBeenCalled();
  });

  it("autorise le super-admin et n'applique aucune écriture lors de l'analyse", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    vi.mocked(reconcilierDemarche).mockResolvedValue({
      lignes: [],
      totaux: {},
      rattachementsAppliques: 0,
      scanComplet: true,
      pagesLues: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await analyserReconciliationAction(Step.ELIGIBILITE);

    expect(result.success).toBe(true);
    expect(reconcilierDemarche).toHaveBeenCalledWith(expect.objectContaining({ apply: false }));
  });

  it("refuse une étape sans démarche à balayer", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    const result = await analyserReconciliationAction(Step.CHOIX_AMO);
    expect(result.success).toBe(false);
    expect(reconcilierDemarche).not.toHaveBeenCalled();
  });

  it("refuse l'inspection à un administrateur non super-admin", async () => {
    mockAgent(UserRole.ADMINISTRATEUR);
    const result = await inspecterDossierDnAction("32052358");
    expect(result.success).toBe(false);
    expect(inspecterDossierDn).not.toHaveBeenCalled();
  });

  it("refuse un numéro de dossier non numérique", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    const result = await inspecterDossierDnAction("32052358; DROP TABLE");
    expect(result.success).toBe(false);
    expect(inspecterDossierDn).not.toHaveBeenCalled();
  });

  it("refuse une résolution inconnue", async () => {
    mockAgent(UserRole.SUPER_ADMINISTRATEUR);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resoudreObservationAction("32052358", "n_importe_quoi" as any);
    expect(result.success).toBe(false);
    expect(dsObservationsRepo.resoudre).not.toHaveBeenCalled();
  });
});
