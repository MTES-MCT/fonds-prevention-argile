import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSession } from "@/features/auth/server";
import { parcoursRepo, userRepo, dossierDsRepo } from "@/shared/database/repositories";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { getMaSimulation, aDejaUneSimulation } from "./ma-simulation.service";

vi.mock("@/features/auth/server", () => ({ getSession: vi.fn() }));
vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { findByUserId: vi.fn() },
  userRepo: { findById: vi.fn() },
  dossierDsRepo: { findByParcoursId: vi.fn() },
}));

const mockedSession = vi.mocked(getSession);
const mockedFindByUserId = vi.mocked(parcoursRepo.findByUserId);
const mockedFindDossiers = vi.mocked(dossierDsRepo.findByParcoursId);

const simulationDemandeur = { logement: { commune: "36044" } };

/** Dossier créé par un Aller-vers : la seule adresse, rien d'autre. */
const simulationAgentMinimale = { logement: { commune: "75056", adresse: "12 rue de Paris" } };

/** Correction d'agent réelle : tous les critères sont saisis. */
const simulationAgentComplete = {
  logement: {
    commune: "75056",
    type: "maison",
    code_departement: "75",
    zone_dexposition: "moyenne",
    annee_de_construction: "1980",
    niveaux: 1,
    mitoyen: false,
    proprietaire_occupant: true,
  },
  rga: {
    sinistres: "aucun",
    indemnise_indemnise_rga: false,
    demande_catnat_en_cours: false,
    assure: true,
  },
  menage: { personnes: 2, revenu_rga: 20000 },
};

describe("getMaSimulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindDossiers.mockResolvedValue([]);
    vi.mocked(userRepo.findById).mockResolvedValue({ prenom: "Georges", nom: "Dupont" } as never);
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationData: simulationDemandeur,
      rgaSimulationDataAgent: null,
    } as never);
  });

  it("retourne la simulation du demandeur, modifiable", async () => {
    const res = await getMaSimulation();

    expect(res?.rgaData).toEqual(simulationDemandeur);
    expect(res?.nomComplet).toBe("Georges Dupont");
    expect(res?.lectureSeule).toBeNull();
  });

  it("affiche la correction de l'agent et verrouille l'édition", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationData: simulationDemandeur,
      rgaSimulationDataAgent: simulationAgentComplete,
    } as never);

    const res = await getMaSimulation();

    // AGENT-first : montrer autre chose que ce qui fait foi tromperait le demandeur.
    expect(res?.rgaData).toEqual(simulationAgentComplete);
    expect(res?.lectureSeule).toBe("correction_agent");
  });

  it("ignore une simulation d'agent incomplète : elle ne verrouille rien", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationData: simulationDemandeur,
      rgaSimulationDataAgent: simulationAgentMinimale,
    } as never);

    const res = await getMaSimulation();

    expect(res?.rgaData).toEqual(simulationDemandeur);
    expect(res?.lectureSeule).toBeNull();
  });

  it("retourne null quand l'agent n'a saisi qu'une adresse et que le demandeur n'a rien simulé", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationData: null,
      rgaSimulationDataAgent: simulationAgentMinimale,
    } as never);

    // Rien à éditer : la page renvoie au simulateur, qui doit rester ouvert.
    expect(await getMaSimulation()).toBeNull();
  });

  it("verrouille pendant l'instruction du formulaire d'éligibilité", async () => {
    mockedFindDossiers.mockResolvedValue([{ step: Step.ELIGIBILITE, dsStatus: DSStatus.EN_CONSTRUCTION }] as never);

    expect((await getMaSimulation())?.lectureSeule).toBe("dossier_chez_la_ddt");
  });

  it("ignore le statut des étapes suivantes", async () => {
    mockedFindDossiers.mockResolvedValue([{ step: Step.DIAGNOSTIC, dsStatus: DSStatus.EN_INSTRUCTION }] as never);

    expect((await getMaSimulation())?.lectureSeule).toBeNull();
  });

  it("retourne null sans session, sans parcours ou sans simulation", async () => {
    mockedSession.mockResolvedValue(null as never);
    expect(await getMaSimulation()).toBeNull();

    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue(null as never);
    expect(await getMaSimulation()).toBeNull();

    mockedFindByUserId.mockResolvedValue({ id: "p1", rgaSimulationData: null } as never);
    expect(await getMaSimulation()).toBeNull();
  });
});

describe("aDejaUneSimulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue({ userId: "u1" } as never);
  });

  it("ferme le simulateur public dès qu'une simulation existe", async () => {
    mockedFindByUserId.mockResolvedValue({ id: "p1", rgaSimulationData: simulationDemandeur } as never);

    expect(await aDejaUneSimulation()).toBe(true);
  });

  it("compte la simulation complète saisie par un agent à l'invitation", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationData: null,
      rgaSimulationDataAgent: simulationAgentComplete,
    } as never);

    expect(await aDejaUneSimulation()).toBe(true);
  });

  it("laisse le simulateur ouvert quand l'agent n'a saisi qu'une adresse", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationData: null,
      rgaSimulationDataAgent: simulationAgentMinimale,
    } as never);

    // Sinon : /simulateur renvoie à l'édition, l'édition est en lecture seule, et
    // « Éligibilité manquante » renvoie au simulateur — le demandeur tourne en rond.
    expect(await aDejaUneSimulation()).toBe(false);
  });

  it("laisse le simulateur ouvert au visiteur et au compte sans simulation", async () => {
    mockedSession.mockResolvedValue(null as never);
    expect(await aDejaUneSimulation()).toBe(false);

    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue({ id: "p1", rgaSimulationData: null } as never);
    expect(await aDejaUneSimulation()).toBe(false);
  });
});
