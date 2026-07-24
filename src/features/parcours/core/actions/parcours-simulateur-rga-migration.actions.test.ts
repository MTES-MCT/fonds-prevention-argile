import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { emitBrevoEvent, BREVO_EVENTS, buildConseillerAttributes } from "@/shared/email/brevo";
import { isSimulationComplete } from "@/features/simulateur/domain/rules/navigation";
import { migrateSimulationDataToDatabase } from "./parcours-simulateur-rga-migration.actions";
import { isSameSimulationContent } from "../utils/simulation-comparison";

vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findByUserId: vi.fn(), updateRGAData: vi.fn() },
}));
vi.mock("@/features/simulateur/domain/rules/navigation", () => ({ isSimulationComplete: vi.fn() }));
vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
  buildConseillerAttributes: vi.fn(),
}));

const mockedSession = vi.mocked(getSession);
const mockedFindByUserId = vi.mocked(parcoursRepo.findByUserId);
const mockedUpdateRGAData = vi.mocked(parcoursRepo.updateRGAData);
const mockedIsComplete = vi.mocked(isSimulationComplete);
const mockedEmit = vi.mocked(emitBrevoEvent);
const mockedBuildConseillerAttributes = vi.mocked(buildConseillerAttributes);

const rgaData = { logement: { commune: "36044" } } as never;

describe("migrateSimulationDataToDatabase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue({ id: "p1", rgaSimulationDataAgent: null } as never);
    mockedIsComplete.mockReturnValue(false);
    mockedBuildConseillerAttributes.mockResolvedValue({});
  });

  it("émet simulation_enregistree après avoir migré une simulation nouvelle", async () => {
    const res = await migrateSimulationDataToDatabase(rgaData);

    expect(res.success).toBe(true);
    expect(mockedUpdateRGAData).toHaveBeenCalledWith("p1", expect.objectContaining({ logement: { commune: "36044" } }));
    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_ENREGISTREE, { attributes: {} });
  });

  it("rafraîchit les attributs conseiller (territoire tout juste connu) avec simulation_enregistree", async () => {
    mockedBuildConseillerAttributes.mockResolvedValue({ CONSEILLER_TYPE: "ALLERS_VERS", CONSEILLER_NOM: "ADIL 36" });

    await migrateSimulationDataToDatabase(rgaData);

    expect(mockedBuildConseillerAttributes).toHaveBeenCalledWith("p1");
    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_ENREGISTREE, {
      attributes: { CONSEILLER_TYPE: "ALLERS_VERS", CONSEILLER_NOM: "ADIL 36" },
    });
  });

  it("idempotent : ne réécrit ni n'émet quand le contenu est identique (hors simulatedAt)", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationDataAgent: null,
      rgaSimulationData: { logement: { commune: "36044" }, simulatedAt: "2026-07-21T00:00:00Z" },
    } as never);

    const res = await migrateSimulationDataToDatabase(rgaData);

    expect(res.success).toBe(true);
    expect(mockedUpdateRGAData).not.toHaveBeenCalled();
    expect(mockedEmit).not.toHaveBeenCalled();
  });

  it("émet quand le contenu de la simulation a changé", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationDataAgent: null,
      rgaSimulationData: { logement: { commune: "75056" }, simulatedAt: "2026-07-21T00:00:00Z" },
    } as never);

    const res = await migrateSimulationDataToDatabase(rgaData);

    expect(res.success).toBe(true);
    expect(mockedUpdateRGAData).toHaveBeenCalled();
    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_ENREGISTREE, { attributes: {} });
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

describe("isSameSimulationContent", () => {
  it("ignore simulatedAt", () => {
    const a = { logement: { commune: "36044" }, simulatedAt: "2026-07-21T00:00:00Z" } as never;
    const b = { logement: { commune: "36044" }, simulatedAt: "2026-07-22T10:00:00Z" } as never;
    expect(isSameSimulationContent(a, b)).toBe(true);
  });

  it("indépendant de l'ordre des clés", () => {
    const a = { logement: { commune: "36044", type: "maison" } } as never;
    const b = { logement: { type: "maison", commune: "36044" } } as never;
    expect(isSameSimulationContent(a, b)).toBe(true);
  });

  it("détecte un vrai changement de contenu", () => {
    const a = { logement: { commune: "36044" } } as never;
    const b = { logement: { commune: "75056" } } as never;
    expect(isSameSimulationContent(a, b)).toBe(false);
  });

  it("null/absent = changement (1er rattachement)", () => {
    expect(isSameSimulationContent(null, { logement: {} } as never)).toBe(false);
  });
});
