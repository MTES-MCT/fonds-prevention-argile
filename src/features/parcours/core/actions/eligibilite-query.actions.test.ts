import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { RAISON_ARCHIVAGE_NON_ELIGIBLE } from "@/features/simulateur/domain/services/eligibilite-archivage.service";
import { estLogementDeclareNonEligible } from "./eligibilite-query.actions";

vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({ parcoursRepo: { findByUserId: vi.fn() } }));

const mockedSession = vi.mocked(getSession);
const mockedFindByUserId = vi.mocked(parcoursRepo.findByUserId);

describe("estLogementDeclareNonEligible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
  });

  it("signale un dossier archivé pour inéligibilité", async () => {
    mockedFindByUserId.mockResolvedValue({
      archivedAt: new Date(),
      archiveReason: RAISON_ARCHIVAGE_NON_ELIGIBLE,
    } as never);

    expect(await estLogementDeclareNonEligible()).toEqual({ success: true, data: true });
  });

  it("ne signale rien sur un dossier actif, AMO ayant validé ou non", async () => {
    mockedFindByUserId.mockResolvedValue({ archivedAt: null, archiveReason: null } as never);

    // Le cas d'Angela : l'AMO a validé l'éligibilité, rien n'est archivé. La décision
    // de l'AMO vit dans `statutAmo` et ne doit pas ressortir ici en inéligibilité.
    expect(await estLogementDeclareNonEligible()).toEqual({ success: true, data: false });
  });

  it("ne signale rien sur un archivage manuel (abandon, non-réponse)", async () => {
    mockedFindByUserId.mockResolvedValue({
      archivedAt: new Date(),
      archiveReason: "Demandeur injoignable",
    } as never);

    expect(await estLogementDeclareNonEligible()).toEqual({ success: true, data: false });
  });

  it("retombe à faux dès le dé-archivage, sans attendre une nouvelle qualification", async () => {
    mockedFindByUserId.mockResolvedValue({
      archivedAt: null,
      archiveReason: RAISON_ARCHIVAGE_NON_ELIGIBLE,
    } as never);

    expect(await estLogementDeclareNonEligible()).toEqual({ success: true, data: false });
  });

  it("refuse sans session", async () => {
    mockedSession.mockResolvedValue(null as never);

    expect((await estLogementDeclareNonEligible()).success).toBe(false);
  });
});
