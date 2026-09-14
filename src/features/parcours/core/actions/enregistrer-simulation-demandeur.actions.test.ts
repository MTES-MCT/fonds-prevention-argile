import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSession } from "@/features/auth/server";
import { parcoursRepo, userRepo, dossierDsRepo } from "@/shared/database/repositories";
import { emitBrevoEvent, BREVO_EVENTS, buildConseillerAttributes } from "@/shared/email/brevo";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { appliquerVerdictSimulationDemandeur } from "../services/simulation-eligibilite.service";
import { chargerEtatEditionSimulation } from "../services/etat-edition-simulation.service";
import { enregistrerSimulationDemandeurAction } from "./enregistrer-simulation-demandeur.actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findByUserId: vi.fn(), updateRGAData: vi.fn() },
  userRepo: { findById: vi.fn() },
  dossierDsRepo: { findByParcoursId: vi.fn() },
}));
vi.mock("../services/simulation-eligibilite.service", () => ({
  appliquerVerdictSimulationDemandeur: vi.fn(),
}));
// Les verrous sont assemblés ailleurs (et testés là-bas) : ici on ne vérifie que la barrière.
vi.mock("../services/etat-edition-simulation.service", () => ({
  chargerEtatEditionSimulation: vi.fn(),
}));
// Même barrière que parcours-simulateur-rga-migration.actions.test.ts : le graphe réel
// de @/shared/email/brevo touche le client DB au chargement du module.
vi.mock("@/shared/database/client", () => ({ db: {} }));
vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
  buildConseillerAttributes: vi.fn(),
}));

const mockedSession = vi.mocked(getSession);
const mockedFindByUserId = vi.mocked(parcoursRepo.findByUserId);
const mockedUpdateRGAData = vi.mocked(parcoursRepo.updateRGAData);
const mockedFindDossiers = vi.mocked(dossierDsRepo.findByParcoursId);
const mockedVerdict = vi.mocked(appliquerVerdictSimulationDemandeur);
const mockedEmit = vi.mocked(emitBrevoEvent);

const rgaData = { logement: { commune: "36044" } } as never;
const parcours = { id: "p1", rgaSimulationData: { logement: { commune: "75056" } }, rgaSimulationDataAgent: null };

const mockedEtat = vi.mocked(chargerEtatEditionSimulation);

/** Aucun verrou : l'état nominal d'un demandeur qui corrige sa propre simulation. */
const LIBRE = {
  simulationCorrigeeParAgent: false,
  decisionAmoRendue: false,
  eligibiliteDossierExiste: false,
  eligibiliteDsStatus: null,
};

describe("enregistrerSimulationDemandeurAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue(parcours as never);
    mockedFindDossiers.mockResolvedValue([]);
    mockedEtat.mockResolvedValue(LIBRE);
    mockedVerdict.mockResolvedValue({
      archived: false,
      unarchived: false,
      raisonActualisee: false,
      nonEligible: false,
    });
    vi.mocked(userRepo.findById).mockResolvedValue({ prenom: "Georges", nom: "Dupont" } as never);
    vi.mocked(buildConseillerAttributes).mockResolvedValue({});
  });

  it("enregistre la simulation corrigée et émet simulation_enregistree", async () => {
    const res = await enregistrerSimulationDemandeurAction(rgaData);

    expect(res.success).toBe(true);
    expect(mockedUpdateRGAData).toHaveBeenCalledWith("p1", expect.objectContaining({ logement: { commune: "36044" } }));
    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_ENREGISTREE, { attributes: {} });
  });

  it("applique le verdict avec le nom du demandeur, pour l'audit", async () => {
    await enregistrerSimulationDemandeurAction(rgaData);

    expect(mockedVerdict).toHaveBeenCalledWith(expect.objectContaining({ parcours, demandeurNom: "Georges Dupont" }));
  });

  it("émet simulation_non_eligible au basculement vers l'inéligibilité", async () => {
    mockedVerdict.mockResolvedValue({ archived: true, unarchived: false, raisonActualisee: false, nonEligible: true });

    const res = await enregistrerSimulationDemandeurAction(rgaData);

    expect(res.success && res.data.nonEligible).toBe(true);
    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_NON_ELIGIBLE);
  });

  it("émet simulation_redevenue_eligible quand la correction dé-archive le dossier", async () => {
    mockedVerdict.mockResolvedValue({ archived: false, unarchived: true, raisonActualisee: false, nonEligible: false });

    await enregistrerSimulationDemandeurAction(rgaData);

    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_REDEVENUE_ELIGIBLE);
    // Le compte a déjà été accueilli : le mail de bienvenue ne doit pas repartir.
    expect(mockedEmit).not.toHaveBeenCalledWith("p1", BREVO_EVENTS.DEMANDEUR_CREE, expect.anything());
  });

  it("ne signale rien de plus quand une correction laisse le dossier éligible et actif", async () => {
    await enregistrerSimulationDemandeurAction(rgaData);

    expect(mockedEmit).toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_ENREGISTREE, { attributes: {} });
    expect(mockedEmit).not.toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_REDEVENUE_ELIGIBLE);
  });

  it("ne renvoie pas le mail d'inéligibilité sur une correction d'un dossier déjà archivé", async () => {
    mockedVerdict.mockResolvedValue({
      archived: false,
      unarchived: false,
      raisonActualisee: true,
      nonEligible: true,
    });

    await enregistrerSimulationDemandeurAction(rgaData);

    expect(mockedEmit).not.toHaveBeenCalledWith("p1", BREVO_EVENTS.SIMULATION_NON_ELIGIBLE);
  });

  it("n'écrit rien quand la simulation est inchangée", async () => {
    mockedFindByUserId.mockResolvedValue({
      ...parcours,
      rgaSimulationData: { logement: { commune: "36044" }, simulatedAt: "2026-07-21T00:00:00Z" },
    } as never);

    const res = await enregistrerSimulationDemandeurAction(rgaData);

    expect(res.success).toBe(true);
    expect(mockedUpdateRGAData).not.toHaveBeenCalled();
    expect(mockedEmit).not.toHaveBeenCalled();
  });

  it("refuse dès qu'un verrou est posé, quel qu'il soit", async () => {
    for (const verrou of [
      { simulationCorrigeeParAgent: true },
      { decisionAmoRendue: true },
      { eligibiliteDossierExiste: true },
    ]) {
      mockedEtat.mockResolvedValue({ ...LIBRE, ...verrou });

      const res = await enregistrerSimulationDemandeurAction(rgaData);

      expect(res.success).toBe(false);
      expect(mockedUpdateRGAData).not.toHaveBeenCalled();
    }
  });

  it("refuse une correction que l'AMO a déjà tranchée, même par l'arbitrage", async () => {
    // `resoudreConflit("candidate")` passe par la même action : le verrou vaut pour les
    // deux chemins d'écriture, sinon l'arbitrage rouvrirait ce que l'écran ferme.
    mockedEtat.mockResolvedValue({ ...LIBRE, decisionAmoRendue: true });

    const res = await enregistrerSimulationDemandeurAction(rgaData);

    expect(res).toEqual({ success: false, error: "Vos données de simulation ne sont plus modifiables" });
  });

  it("refuse pendant que la DDT instruit le formulaire d'éligibilité", async () => {
    mockedEtat.mockResolvedValue({ ...LIBRE, eligibiliteDsStatus: DSStatus.EN_INSTRUCTION });

    const res = await enregistrerSimulationDemandeurAction(rgaData);

    expect(res.success).toBe(false);
    expect(mockedUpdateRGAData).not.toHaveBeenCalled();
  });

  it("rouvre l'édition une fois la décision de la DDT rendue", async () => {
    mockedEtat.mockResolvedValue({ ...LIBRE, eligibiliteDsStatus: DSStatus.REFUSE });

    const res = await enregistrerSimulationDemandeurAction(rgaData);

    expect(res.success).toBe(true);
    expect(mockedUpdateRGAData).toHaveBeenCalled();
  });

  it("refuse sans session : le parcours vient de la session, jamais du client", async () => {
    mockedSession.mockResolvedValue(null as never);

    const res = await enregistrerSimulationDemandeurAction(rgaData);

    expect(res.success).toBe(false);
    expect(mockedFindByUserId).not.toHaveBeenCalled();
  });
});
