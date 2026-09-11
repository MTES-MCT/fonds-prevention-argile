import { describe, it, expect, vi, beforeEach } from "vitest";
import { parcoursRepo, prospectQualificationsRepo, dossierDsRepo } from "@/shared/database/repositories";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import {
  ACTION_TYPE_SIMULATION_NON_ELIGIBLE,
  ACTION_TYPE_DOSSIER_DESARCHIVE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import type { PartialRGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { appliquerVerdictSimulationDemandeur } from "./simulation-eligibilite.service";

vi.mock("@/shared/database/repositories", () => ({
  parcoursRepo: { updateSituationParticulier: vi.fn() },
  prospectQualificationsRepo: { create: vi.fn(), findLatestByParcoursId: vi.fn(async () => null) },
  dossierDsRepo: { getSubmittedDatesByStep: vi.fn(async () => new Map()) },
}));
vi.mock("@/features/backoffice/espace-agent/shared/services/action-audit.service", () => ({
  logSystemAction: vi.fn(async () => true),
}));
// Aucun dé-archivage testé ici n'a de validation AMO : le select renvoie une liste vide.
vi.mock("@/shared/database/client", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) },
}));

const SIM_NON_ELIGIBLE: PartialRGASimulationData = {
  logement: { type: "appartement", code_departement: "36", commune: "36044" },
};
const SIM_SANS_VERDICT: PartialRGASimulationData = { logement: { type: "maison" } };
const SIM_ELIGIBLE: PartialRGASimulationData = {
  logement: {
    type: "maison",
    code_departement: "47",
    zone_dexposition: "fort",
    annee_de_construction: (new Date().getFullYear() - 20).toString(),
    niveaux: 2,
    mitoyen: false,
    proprietaire_occupant: true,
  },
  rga: { sinistres: "saine", indemnise_indemnise_rga: false, demande_catnat_en_cours: false, assure: true },
  menage: { personnes: 2, revenu_rga: 25000 },
};

function parcours(overrides: Record<string, unknown> = {}) {
  return { id: "p1", userId: "u1", archivedAt: null, archiveReason: null, ...overrides } as never;
}

describe("appliquerVerdictSimulationDemandeur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(dossierDsRepo.getSubmittedDatesByStep).mockResolvedValue(new Map());
    vi.mocked(prospectQualificationsRepo.findLatestByParcoursId).mockResolvedValue(null);
  });

  it("archive et qualifie le dossier quand la simulation est non éligible", async () => {
    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours(),
      rgaData: SIM_NON_ELIGIBLE,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: true, unarchived: false, raisonActualisee: false, nonEligible: true });
    expect(prospectQualificationsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        parcoursId: "p1",
        agentId: null,
        decision: "non_eligible",
        raisonsIneligibilite: ["appartement"],
      })
    );
    // Raison canonique : les stats « demandes inéligibles » filtrent dessus à l'exact.
    expect(parcoursRepo.updateSituationParticulier).toHaveBeenCalledWith(
      "p1",
      SituationParticulier.ARCHIVE,
      "Non éligible au dispositif"
    );
    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: ACTION_TYPE_SIMULATION_NON_ELIGIBLE,
        author: { demandeur: { nom: "Marie Durand" } },
      })
    );
  });

  it("ne fait rien sur une simulation sans verdict tranché", async () => {
    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours(),
      rgaData: SIM_SANS_VERDICT,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: false, unarchived: false, raisonActualisee: false, nonEligible: false });
    expect(parcoursRepo.updateSituationParticulier).not.toHaveBeenCalled();
    expect(prospectQualificationsRepo.create).not.toHaveBeenCalled();
  });

  const ARCHIVE_NON_ELIGIBLE = { archivedAt: new Date("2026-09-01"), archiveReason: "Non éligible au dispositif" };

  it("est idempotent : n'archive pas deux fois, et n'empile rien si la raison est inchangée", async () => {
    vi.mocked(prospectQualificationsRepo.findLatestByParcoursId).mockResolvedValue({
      agentId: null,
      raisonsIneligibilite: ["appartement"],
    } as never);

    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours(ARCHIVE_NON_ELIGIBLE),
      rgaData: SIM_NON_ELIGIBLE,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: false, unarchived: false, raisonActualisee: false, nonEligible: true });
    expect(parcoursRepo.updateSituationParticulier).not.toHaveBeenCalled();
    expect(prospectQualificationsRepo.create).not.toHaveBeenCalled();
  });

  it("actualise la raison quand une nouvelle simulation reste non éligible autrement", async () => {
    vi.mocked(prospectQualificationsRepo.findLatestByParcoursId).mockResolvedValue({
      agentId: null,
      raisonsIneligibilite: ["hors_plafonds_ressources"],
    } as never);

    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours(ARCHIVE_NON_ELIGIBLE),
      rgaData: SIM_NON_ELIGIBLE,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: false, unarchived: false, raisonActualisee: true, nonEligible: true });
    expect(prospectQualificationsRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: null, raisonsIneligibilite: ["appartement"] })
    );
    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: ACTION_TYPE_SIMULATION_NON_ELIGIBLE })
    );
    // archivedAt ne doit pas glisser : le dossier est archivé depuis le 1er septembre.
    expect(parcoursRepo.updateSituationParticulier).not.toHaveBeenCalled();
  });

  it("ne remplace jamais la qualification d'un agent", async () => {
    vi.mocked(prospectQualificationsRepo.findLatestByParcoursId).mockResolvedValue({
      agentId: "agent-1",
      raisonsIneligibilite: ["hors_plafonds_ressources"],
    } as never);

    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours(ARCHIVE_NON_ELIGIBLE),
      rgaData: SIM_NON_ELIGIBLE,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: false, unarchived: false, raisonActualisee: false, nonEligible: true });
    expect(prospectQualificationsRepo.create).not.toHaveBeenCalled();
  });

  it("ne touche pas à un dossier archivé manuellement", async () => {
    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours({ archivedAt: new Date(), archiveReason: "Le demandeur a abandonné le projet" }),
      rgaData: SIM_NON_ELIGIBLE,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: false, unarchived: false, raisonActualisee: false, nonEligible: true });
    expect(prospectQualificationsRepo.findLatestByParcoursId).not.toHaveBeenCalled();
    expect(prospectQualificationsRepo.create).not.toHaveBeenCalled();
  });

  it("n'archive pas un dossier dont un formulaire DN est déjà déposé", async () => {
    vi.mocked(dossierDsRepo.getSubmittedDatesByStep).mockResolvedValue(new Map([["eligibilite", new Date()]]));

    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours(),
      rgaData: SIM_NON_ELIGIBLE,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: false, unarchived: false, raisonActualisee: false, nonEligible: false });
    expect(parcoursRepo.updateSituationParticulier).not.toHaveBeenCalled();
  });

  it("dé-archive quand la simulation redevient éligible", async () => {
    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours({ archivedAt: new Date(), archiveReason: "Non éligible au dispositif" }),
      rgaData: SIM_ELIGIBLE,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: false, unarchived: true, raisonActualisee: false, nonEligible: false });
    expect(parcoursRepo.updateSituationParticulier).toHaveBeenCalledWith("p1", SituationParticulier.PROSPECT);
    expect(logSystemAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: ACTION_TYPE_DOSSIER_DESARCHIVE })
    );
  });

  it("ne défait jamais un archivage manuel", async () => {
    const res = await appliquerVerdictSimulationDemandeur({
      parcours: parcours({ archivedAt: new Date(), archiveReason: "Le demandeur a abandonné le projet" }),
      rgaData: SIM_ELIGIBLE,
      demandeurNom: "Marie Durand",
    });

    expect(res).toEqual({ archived: false, unarchived: false, raisonActualisee: false, nonEligible: false });
    expect(parcoursRepo.updateSituationParticulier).not.toHaveBeenCalled();
  });
});
