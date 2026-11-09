import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/database/client", () => ({
  db: { transaction: vi.fn((fn: (tx: unknown) => unknown) => fn("tx")) },
}));
vi.mock("@/shared/database/repositories/structures.repository", () => ({
  structuresRepository: {
    findAllPourListe: vi.fn(),
    findIdentite: vi.fn(),
    findIdBySiret: vi.fn(),
    findAvecHabilitations: vi.fn(),
    mettreAJourIdentite: vi.fn(),
    verrouiller: vi.fn(),
    supprimer: vi.fn(),
    creer: vi.fn(async () => "s-neuve"),
  },
}));
vi.mock("@/shared/database/repositories/entreprises-amo.repository", () => ({
  entreprisesAmoRepository: {
    findHabilitationParStructure: vi.fn(),
    getCommunesByEntrepriseAmoId: vi.fn(async () => []),
    getEpcisByEntrepriseAmoId: vi.fn(async () => []),
    compterValidations: vi.fn(),
    ajouter: vi.fn(async () => "amo-1"),
    updateCommunesRelations: vi.fn(),
    updateEpciRelations: vi.fn(),
    supprimerAvecStructure: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("@/shared/database/repositories/allers-vers.repository", () => ({
  allersVersRepository: { findHabilitationParStructure: vi.fn(), supprimerAvecStructure: vi.fn() },
}));
vi.mock("@/shared/database/repositories/experts.repository", () => ({
  expertsRepository: { findByStructure: vi.fn(), ajouter: vi.fn(), supprimer: vi.fn() },
}));
vi.mock("@/shared/database/repositories/agents.repository", () => ({
  agentsRepository: {
    findAllAvecStructure: vi.fn(),
    compterParStructure: vi.fn(),
    resynchroniserColonnesHeritees: vi.fn(),
  },
}));

import {
  ajouterHabilitation,
  chargerFiche,
  creerStructure,
  listerStructures,
  modifierIdentite,
  retirerHabilitation,
  supprimerStructure,
} from "./structures-admin.service";
import { structuresRepository } from "@/shared/database/repositories/structures.repository";
import { entreprisesAmoRepository } from "@/shared/database/repositories/entreprises-amo.repository";
import { allersVersRepository } from "@/shared/database/repositories/allers-vers.repository";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { agentsRepository } from "@/shared/database/repositories/agents.repository";

const IDENTITE = { nom: "Soliha 36", siret: "39248872200027", adresse: "", telephone: "", horaires: null };
const AMO = { departements: "Indre 36", emails: "a@amo.fr", communes: ["36044"], epci: [] };
const structureAmo = {
  id: "s1",
  type: "accompagnement" as const,
  nom: "Soliha 36",
  entrepriseAmo: { id: "amo-1", nom: "Soliha 36" },
  allersVers: null,
  expert: null,
};
const EXPERT = {
  id: "e1",
  nom: "Géotech",
  siret: "39248872200027",
  dateValidationDhup: null,
  contactInterneNom: "Camille Interne",
  contactInterneEmail: null,
  contactInterneTelephone: null,
  desactiveAt: new Date("2026-10-01"),
  desactiveParNom: null,
  desactiveRaison: "Départ",
  departements: [{ codeDepartement: "63", email: null, telephone: null }],
};

describe("structures-admin.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks garde les valeurs résolues d'un test à l'autre : chaque test repart d'ici.
    vi.mocked(structuresRepository.findIdentite).mockResolvedValue(IDENTITE);
    vi.mocked(structuresRepository.findIdBySiret).mockResolvedValue(null);
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue(structureAmo);
    vi.mocked(agentsRepository.findAllAvecStructure).mockResolvedValue([]);
    vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(0);
    vi.mocked(entreprisesAmoRepository.findHabilitationParStructure).mockResolvedValue(null);
    vi.mocked(entreprisesAmoRepository.compterValidations).mockResolvedValue(0);
    vi.mocked(allersVersRepository.findHabilitationParStructure).mockResolvedValue(null);
    vi.mocked(expertsRepository.findByStructure).mockResolvedValue(null);
  });

  it("ne montre une structure expert désactivée qu'au super-administrateur", async () => {
    vi.mocked(structuresRepository.findAllPourListe).mockResolvedValue([
      {
        id: "s2",
        type: "expert",
        nom: "Géotech",
        siret: "39248872200027",
        amoDepartements: null,
        allersVersDepartements: [],
        aAllersVers: false,
        expertDepartements: ["63"],
        aExpert: true,
        expertDesactive: true,
        agentsActifs: 0,
      },
    ]);
    vi.mocked(structuresRepository.findAvecHabilitations).mockResolvedValue({
      ...structureAmo,
      type: "expert",
      entrepriseAmo: null,
      expert: { id: "e1", nom: "Géotech" },
    });
    vi.mocked(expertsRepository.findByStructure).mockResolvedValue(EXPERT);

    expect(await listerStructures(false)).toEqual([]);
    expect((await listerStructures(true))[0]).toMatchObject({ type: "expert", expertDesactive: true });
    expect(await chargerFiche("s2", false)).toBeNull();
    expect((await chargerFiche("s2", true))?.expert).toMatchObject({ contactInterne: { nom: "Camille Interne" } });
  });

  it("ne nomme les agents qu'au super-administrateur, mais en donne le nombre à tous", async () => {
    vi.mocked(agentsRepository.findAllAvecStructure).mockResolvedValue([
      { id: "a1", structureId: "s1", givenName: "Marie", usualName: "Curie", email: "m@s.fr", desactiveAt: null },
    ] as never);

    expect(await chargerFiche("s1", false)).toMatchObject({ type: "accompagnement", nombreAgents: 1, agents: null });
    expect((await chargerFiche("s1", true))?.agents).toEqual([
      { id: "a1", nomComplet: "Marie Curie", email: "m@s.fr", desactive: false },
    ]);
  });

  describe("création", () => {
    it("crée la structure avec sa première habilitation, qui fixe son type", async () => {
      expect(await creerStructure(IDENTITE, { habilitation: "amo", saisie: AMO })).toBe("s-neuve");
      expect(structuresRepository.creer).toHaveBeenCalledWith(IDENTITE, "accompagnement", "tx");
      expect(entreprisesAmoRepository.ajouter).toHaveBeenCalledWith("s-neuve", AMO, "tx");
      expect(agentsRepository.resynchroniserColonnesHeritees).toHaveBeenCalledWith("s-neuve", "tx");

      await creerStructure(IDENTITE, { habilitation: "expert", saisie: { departements: [] } as never });
      expect(structuresRepository.creer).toHaveBeenLastCalledWith(IDENTITE, "expert", "tx");
    });

    it("refuse une AMO sans SIRET, et un SIRET déjà pris dans le même type", async () => {
      await expect(creerStructure({ ...IDENTITE, siret: null }, { habilitation: "amo", saisie: AMO })).rejects.toThrow(
        "Renseignez le SIRET"
      );
      vi.mocked(structuresRepository.findIdBySiret).mockResolvedValue("s2");
      await expect(creerStructure(IDENTITE, { habilitation: "amo", saisie: AMO })).rejects.toThrow(
        "Une autre structure a déjà ce SIRET"
      );
      expect(structuresRepository.findIdBySiret).toHaveBeenCalledWith(IDENTITE.siret, "accompagnement", "tx");
      expect(structuresRepository.creer).not.toHaveBeenCalled();
    });
  });

  describe("identité", () => {
    it("refuse de retirer le SIRET d'une structure AMO", async () => {
      await expect(modifierIdentite("s1", { ...IDENTITE, siret: null })).rejects.toThrow("SIRET est obligatoire");
      expect(structuresRepository.mettreAJourIdentite).not.toHaveBeenCalled();
    });

    it("écrit l'identité sous verrou, d'où elle part sur chaque ligne d'habilitation", async () => {
      await modifierIdentite("s1", IDENTITE);

      expect(structuresRepository.verrouiller).toHaveBeenCalledWith("s1", "exclusif", "tx");
      expect(structuresRepository.mettreAJourIdentite).toHaveBeenCalledWith("s1", IDENTITE, "tx");
    });
  });

  describe("habilitations", () => {
    it("refuse l'expertise sur une structure d'accompagnement, et une habilitation déjà présente", async () => {
      await expect(ajouterHabilitation("s1", { habilitation: "expert", saisie: {} as never })).rejects.toThrow(
        "créez une structure expert"
      );
      await expect(ajouterHabilitation("s1", { habilitation: "amo", saisie: AMO })).rejects.toThrow("déjà");
      expect(expertsRepository.ajouter).not.toHaveBeenCalled();
    });

    it("refuse de retirer la dernière habilitation : la structure se supprime", async () => {
      vi.mocked(entreprisesAmoRepository.findHabilitationParStructure).mockResolvedValue({
        id: "amo-1",
        departements: "Indre 36",
        emails: "a@amo.fr",
      });

      await expect(retirerHabilitation("s1", "amo")).rejects.toThrow("dernière habilitation");
      expect(entreprisesAmoRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe("suppression", () => {
    it("supprime la structure avec ses habilitations quand rien n'en dépend", async () => {
      vi.mocked(entreprisesAmoRepository.findHabilitationParStructure).mockResolvedValue({
        id: "amo-1",
        departements: "Indre 36",
        emails: "a@amo.fr",
      });
      vi.mocked(allersVersRepository.findHabilitationParStructure).mockResolvedValue({ id: "av-1", emails: [] });

      await supprimerStructure("s1");

      expect(entreprisesAmoRepository.supprimerAvecStructure).toHaveBeenCalledWith("amo-1", "tx");
      expect(allersVersRepository.supprimerAvecStructure).toHaveBeenCalledWith("av-1", "tx");
      expect(structuresRepository.supprimer).toHaveBeenCalledWith("s1", "tx");
    });

    it("refuse quand des agents y sont rattachés, ou que son AMO suit des dossiers", async () => {
      vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(1);
      await expect(supprimerStructure("s1")).rejects.toThrow("agents");

      vi.mocked(agentsRepository.compterParStructure).mockResolvedValue(0);
      vi.mocked(entreprisesAmoRepository.findHabilitationParStructure).mockResolvedValue({
        id: "amo-1",
        departements: "Indre 36",
        emails: "a@amo.fr",
      });
      vi.mocked(entreprisesAmoRepository.compterValidations).mockResolvedValue(12);
      await expect(supprimerStructure("s1")).rejects.toThrow("12 dossier(s)");
      expect(structuresRepository.supprimer).not.toHaveBeenCalled();
    });
  });
});
