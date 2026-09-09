import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSession } from "@/features/auth/server";
import { parcoursRepo } from "@/shared/database/repositories";
import { emitBrevoEvent, BREVO_EVENTS, buildConseillerAttributes } from "@/shared/email/brevo";
import { isSimulationComplete } from "@/features/simulateur/domain/rules/navigation";
import { migrateSimulationDataToDatabase } from "./parcours-simulateur-rga-migration.actions";
import { isSameSimulationContent } from "../utils/simulation-comparison";
import { appliquerVerdictSimulationDemandeur } from "../services/simulation-eligibilite.service";

vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findByUserId: vi.fn(), updateRGAData: vi.fn() },
  userRepo: { findById: vi.fn(async () => ({ prenom: "Marie", nom: "Durand" })) },
}));
// Le verdict d'éligibilité a ses propres tests : ici on vérifie seulement qu'il est
// appliqué avant l'évènement Brevo (SITUATION doit partir à jour).
vi.mock("../services/simulation-eligibilite.service", () => ({
  appliquerVerdictSimulationDemandeur: vi.fn(async () => ({
    archived: false,
    unarchived: false,
    raisonActualisee: false,
    nonEligible: false,
  })),
}));
vi.mock("@/features/simulateur/domain/rules/navigation", () => ({ isSimulationComplete: vi.fn() }));
// La barrière @/shared/email/brevo réimportée via importOriginal ci-dessous tire tout
// son graphe de dépendances réel (contact-mapping -> admin-url-resolver, conseiller-mapping
// -> responsable-resolver -> repositories), qui touche le client DB réel au chargement du
// module quelle que soit la façon dont il est importé plus bas dans le graphe — mocker le
// fichier racine suffit (même pattern que amo-selection/amo-auto/amo-validation.service.test.ts).
// Aucun de ces exports n'est appelé pour de vrai ici : buildConseillerAttributes est mocké
// juste en dessous.
vi.mock("@/shared/database/client", () => ({ db: {} }));
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
    // `clearAllMocks` n'efface pas les implémentations : sans ce reset, un verdict posé
    // par un test fuiterait dans les suivants.
    vi.mocked(appliquerVerdictSimulationDemandeur).mockResolvedValue({
      archived: false,
      unarchived: false,
      raisonActualisee: false,
      nonEligible: false,
    });
    mockedEmit.mockResolvedValue(undefined);
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

  it("n'écrase pas une simulation différente : elle part en arbitrage", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationDataAgent: null,
      rgaSimulationData: { logement: { commune: "75056" }, simulatedAt: "2026-07-21T00:00:00Z" },
    } as never);

    const res = await migrateSimulationDataToDatabase(rgaData);

    // `enregistree: false` laisse le cache local intact : c'est lui qui alimente
    // l'arbitrage sur /mon-compte (ADR-0036).
    expect(res.success && res.data.enregistree).toBe(false);
    expect(mockedUpdateRGAData).not.toHaveBeenCalled();
    expect(mockedEmit).not.toHaveBeenCalled();
  });

  it("applique le verdict d'éligibilité avant d'émettre vers Brevo", async () => {
    const order: string[] = [];
    vi.mocked(appliquerVerdictSimulationDemandeur).mockImplementation(async () => {
      order.push("verdict");
      return { archived: true, unarchived: false, raisonActualisee: false, nonEligible: true };
    });
    mockedEmit.mockImplementation(async () => {
      order.push("brevo");
      return undefined as never;
    });

    await migrateSimulationDataToDatabase(rgaData);

    // 2 pushes quand le dossier est archivé : l'évènement générique, puis le dédié.
    expect(order).toEqual(["verdict", "brevo", "brevo"]);
    expect(appliquerVerdictSimulationDemandeur).toHaveBeenCalledWith(
      expect.objectContaining({ demandeurNom: "Marie Durand" })
    );
  });

  it("émet simulation_non_eligible au 1er archivage, jamais demandeur_cree", async () => {
    vi.mocked(appliquerVerdictSimulationDemandeur).mockResolvedValue({
      archived: true,
      unarchived: false,
      raisonActualisee: false,
      nonEligible: true,
    });

    await migrateSimulationDataToDatabase(rgaData);

    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_NON_ELIGIBLE);
    // Le mail de bienvenue promet un conseiller : il ne doit jamais partir ici.
    expect(mockedEmit).not.toHaveBeenCalledWith("p1", BREVO_EVENTS.DEMANDEUR_CREE, expect.anything());
  });

  it("n'émet pas simulation_non_eligible quand seule la raison est actualisée (pas de 2e mail)", async () => {
    vi.mocked(appliquerVerdictSimulationDemandeur).mockResolvedValue({
      archived: false,
      unarchived: false,
      raisonActualisee: true,
      nonEligible: true,
    });

    await migrateSimulationDataToDatabase(rgaData);

    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_ENREGISTREE, { attributes: {} });
    expect(mockedEmit).not.toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_NON_ELIGIBLE);
  });

  it("émet demandeur_cree à la 1re simulation éligible (bienvenue différée depuis le callback FC)", async () => {
    await migrateSimulationDataToDatabase(rgaData);

    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.DEMANDEUR_CREE, {
      attributes: expect.objectContaining({ A_AMO: false, CREE_PAR_CONSEILLER: false }),
    });
  });

  it("n'émet demandeur_cree qu'une fois : rien ne part sur une simulation ultérieure", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationDataAgent: null,
      rgaSimulationData: { logement: { commune: "75056" }, simulatedAt: "2026-07-21T00:00:00Z" },
    } as never);

    await migrateSimulationDataToDatabase(rgaData);

    expect(mockedEmit).not.toHaveBeenCalledWith("p1", BREVO_EVENTS.DEMANDEUR_CREE, expect.anything());
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
