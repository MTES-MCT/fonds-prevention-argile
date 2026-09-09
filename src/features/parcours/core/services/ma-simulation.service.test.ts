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
const simulationAgent = { logement: { commune: "75056" } };

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
      rgaSimulationDataAgent: simulationAgent,
    } as never);

    const res = await getMaSimulation();

    // AGENT-first : montrer autre chose que ce qui fait foi tromperait le demandeur.
    expect(res?.rgaData).toEqual(simulationAgent);
    expect(res?.lectureSeule).toBe("correction_agent");
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

  it("compte aussi la simulation saisie par un agent à l'invitation", async () => {
    mockedFindByUserId.mockResolvedValue({
      id: "p1",
      rgaSimulationData: null,
      rgaSimulationDataAgent: simulationAgent,
    } as never);

    expect(await aDejaUneSimulation()).toBe(true);
  });

  it("laisse le simulateur ouvert au visiteur et au compte sans simulation", async () => {
    mockedSession.mockResolvedValue(null as never);
    expect(await aDejaUneSimulation()).toBe(false);

    mockedSession.mockResolvedValue({ userId: "u1" } as never);
    mockedFindByUserId.mockResolvedValue({ id: "p1", rgaSimulationData: null } as never);
    expect(await aDejaUneSimulation()).toBe(false);
  });
});
