import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { emitBrevoEvent, BREVO_EVENTS } from "@/shared/email/brevo";
import { isSimulationComplete } from "@/features/simulateur/domain/rules/navigation";
import { migrateSimulationDataToDatabase } from "./parcours-simulateur-rga-migration.actions";

vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findByUserId: vi.fn(), updateRGAData: vi.fn() },
}));
vi.mock("@/features/simulateur/domain/rules/navigation", () => ({ isSimulationComplete: vi.fn() }));
vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
}));

const mockedSession = vi.mocked(getSession);
const mockedFindByUserId = vi.mocked(parcoursRepo.findByUserId);
const mockedUpdateRGAData = vi.mocked(parcoursRepo.updateRGAData);
const mockedIsComplete = vi.mocked(isSimulationComplete);
const mockedEmit = vi.mocked(emitBrevoEvent);

const rgaData = { logement: { commune: "36044" } } as never;

describe("migrateSimulationDataToDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue({ id: "p1", rgaSimulationDataAgent: null } as never);
    mockedIsComplete.mockReturnValue(false);
  });

  it("émet simulation_maj après avoir migré la simulation", async () => {
    const res = await migrateSimulationDataToDatabase(rgaData);

    expect(res.success).toBe(true);
    expect(mockedUpdateRGAData).toHaveBeenCalledWith("p1", expect.objectContaining({ logement: { commune: "36044" } }));
    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_MAJ);
  });

  it("ne migre ni n'émet quand une simulation agent complète existe déjà", async () => {
    mockedFindByUserId.mockResolvedValue({ id: "p1", rgaSimulationDataAgent: { logement: {} } } as never);
    mockedIsComplete.mockReturnValue(true);

    const res = await migrateSimulationDataToDatabase(rgaData);

    expect(res.success).toBe(true);
    expect(mockedUpdateRGAData).not.toHaveBeenCalled();
    expect(mockedEmit).not.toHaveBeenCalled();
  });

  it("n'émet pas si l'utilisateur n'est pas connecté", async () => {
    mockedSession.mockResolvedValue(null as never);

    const res = await migrateSimulationDataToDatabase(rgaData);

    expect(res.success).toBe(false);
    expect(mockedEmit).not.toHaveBeenCalled();
  });
});
