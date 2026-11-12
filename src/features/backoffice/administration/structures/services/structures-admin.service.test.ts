import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "@/shared/database/client";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";
import { structuresRepository } from "@/shared/database/repositories/structures.repository";
import {
  detacherHabilitation,
  fusionnerStructures,
  listerStructures,
  RefusOperationStructure,
} from "./structures-admin.service";

vi.mock("@/shared/database/client", () => ({ db: { transaction: vi.fn() } }));
vi.mock("@/shared/database/repositories/structures.repository", () => ({
  structuresRepository: {
    verrouiller: vi.fn(),
    findAvecHabilitations: vi.fn(),
    findAllAvecHabilitations: vi.fn(),
    rattacherLigne: vi.fn(),
    supprimer: vi.fn(),
    creer: vi.fn(),
    renommer: vi.fn(),
  },
}));
vi.mock("@/shared/database/repositories/agents.repository", () => ({
  agentsRepository: {
    findAllAvecStructure: vi.fn(),
    changerDeStructure: vi.fn(),
    resynchroniserColonnesHeritees: vi.fn(),
  },
}));

const tx = { nom: "transaction" };
const ordre: string[] = [];

const AMO_SEULE = "22222222-2222-4222-8222-222222222222";
const AV_SEUL = "11111111-1111-4111-8111-111111111111";

const structures = {
  [AMO_SEULE]: {
    id: AMO_SEULE,
    nom: "Maison Tranquille",
    entrepriseAmo: { id: "amo-1", nom: "AMO Maison Tranquille" },
    allersVers: null,
    expert: null,
  },
  [AV_SEUL]: {
    id: AV_SEUL,
    nom: "Adil 36",
    entrepriseAmo: null,
    allersVers: { id: "av-1", nom: "Adil 36" },
    expert: null,
  },
  paire: {
    id: "paire",
    nom: "Soliha 54",
    entrepriseAmo: { id: "amo-2", nom: "Soliha 54" },
    allersVers: { id: "av-2", nom: "Soliha Meurthe-et-Moselle" },
    expert: null,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  ordre.length = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(db.transaction).mockImplementation(async (fn: any) => fn(tx));
  vi.mocked(structuresRepository.verrouiller).mockImplementation(async (id) => {
    ordre.push(`verrou ${id}`);
  });
  vi.mocked(structuresRepository.findAvecHabilitations).mockImplementation(
    async (id) => structures[id as keyof typeof structures] ?? null
  );
  vi.mocked(structuresRepository.rattacherLigne).mockImplementation(async (type) => {
    ordre.push(`ligne ${type}`);
  });
  vi.mocked(agentsRepository.changerDeStructure).mockImplementation(async () => {
    ordre.push("agents");
  });
  vi.mocked(agentsRepository.resynchroniserColonnesHeritees).mockImplementation(async () => {
    ordre.push("colonnes héritées");
  });
  vi.mocked(structuresRepository.supprimer).mockImplementation(async () => {
    ordre.push("suppression");
  });
});

describe("fusionnerStructures", () => {
  it("verrouille les deux structures dans l'ordre de leurs identifiants, puis déplace tout dans la cible", async () => {
    await fusionnerStructures(AMO_SEULE, AV_SEUL);

    expect(ordre).toEqual([
      `verrou ${AV_SEUL}`,
      `verrou ${AMO_SEULE}`,
      "ligne allersVers",
      "agents",
      "colonnes héritées",
      "suppression",
    ]);
    expect(structuresRepository.verrouiller).toHaveBeenCalledWith(AV_SEUL, "exclusif", tx);
    expect(structuresRepository.rattacherLigne).toHaveBeenCalledWith("allersVers", "av-1", AMO_SEULE, tx);
    expect(agentsRepository.changerDeStructure).toHaveBeenCalledWith(AV_SEUL, AMO_SEULE, tx);
    expect(agentsRepository.resynchroniserColonnesHeritees).toHaveBeenCalledWith(AMO_SEULE, tx);
    expect(structuresRepository.supprimer).toHaveBeenCalledWith(AV_SEUL, tx);
  });

  it("refuse deux habilitations de même type sans rien écrire", async () => {
    await expect(fusionnerStructures("paire", AMO_SEULE)).rejects.toThrow(
      new RefusOperationStructure("Les deux structures ont déjà une habilitation AMO")
    );
    expect(structuresRepository.rattacherLigne).not.toHaveBeenCalled();
    expect(agentsRepository.changerDeStructure).not.toHaveBeenCalled();
    expect(structuresRepository.supprimer).not.toHaveBeenCalled();
  });

  it("refuse une structure disparue entre l'affichage et la confirmation", async () => {
    await expect(fusionnerStructures(AMO_SEULE, "inconnue")).rejects.toThrow("Structure introuvable");
    expect(structuresRepository.supprimer).not.toHaveBeenCalled();
  });
});

describe("detacherHabilitation", () => {
  it("place l'habilitation dans une nouvelle structure à son nom et réaligne les agents restés", async () => {
    vi.mocked(structuresRepository.creer).mockResolvedValue("nouvelle");

    await detacherHabilitation("paire", "allersVers");

    expect(structuresRepository.verrouiller).toHaveBeenCalledWith("paire", "exclusif", tx);
    expect(structuresRepository.creer).toHaveBeenCalledWith("Soliha Meurthe-et-Moselle", tx);
    expect(structuresRepository.rattacherLigne).toHaveBeenCalledWith("allersVers", "av-2", "nouvelle", tx);
    expect(agentsRepository.resynchroniserColonnesHeritees).toHaveBeenCalledWith("paire", tx);
  });

  it("refuse une structure à une seule habilitation sans rien créer", async () => {
    await expect(detacherHabilitation(AMO_SEULE, "amo")).rejects.toThrow(RefusOperationStructure);
    expect(structuresRepository.creer).not.toHaveBeenCalled();
  });
});

type AgentAvecStructure = Awaited<ReturnType<typeof agentsRepository.findAllAvecStructure>>[number];

// Seuls ces champs sont lus pour ranger un agent sous sa structure.
function agentDe(
  champs: Pick<AgentAvecStructure, "id" | "structureId" | "givenName" | "usualName" | "email" | "desactiveAt">
): AgentAvecStructure {
  return champs as AgentAvecStructure;
}

describe("listerStructures", () => {
  it("range chaque agent sous sa structure, sans les comptes plateforme", async () => {
    vi.mocked(structuresRepository.findAllAvecHabilitations).mockResolvedValue([structures[AV_SEUL]]);
    vi.mocked(agentsRepository.findAllAvecStructure).mockResolvedValue([
      agentDe({
        id: "a-1",
        structureId: AV_SEUL,
        givenName: "Jean",
        usualName: "Dupont",
        email: "j@adil36.fr",
        desactiveAt: null,
      }),
      agentDe({
        id: "a-2",
        structureId: null,
        givenName: "Admin",
        usualName: null,
        email: "a@beta.gouv.fr",
        desactiveAt: null,
      }),
    ]);

    const [adil] = await listerStructures();

    expect(adil.agents).toEqual([{ id: "a-1", nomComplet: "Jean Dupont", email: "j@adil36.fr", desactive: false }]);
  });
});
