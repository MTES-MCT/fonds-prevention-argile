import { describe, it, expect, vi, beforeEach } from "vitest";
import { dossierDsRepo } from "@/shared/database/repositories";
import { db } from "@/shared/database/client";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { chargerEtatEditionSimulation } from "./etat-edition-simulation.service";

vi.mock("@/shared/database/repositories", () => ({ dossierDsRepo: { findByParcoursId: vi.fn() } }));
vi.mock("@/shared/database/client", () => ({ db: { select: vi.fn() } }));

const mockedDossiers = vi.mocked(dossierDsRepo.findByParcoursId);

/** Rejoue la chaîne `select().from().where().limit()` de Drizzle. */
function validationEnBase(statut: StatutValidationAmo | null) {
  const lignes = statut === null ? [] : [{ statut }];
  vi.mocked(db.select).mockReturnValue({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(lignes) }) }),
  } as never);
}

/** Correction d'agent réelle : tous les critères saisis. */
const simulationAgentComplete = {
  logement: {
    type: "maison",
    code_departement: "36",
    zone_dexposition: "fort",
    annee_de_construction: "1980",
    niveaux: 1,
    mitoyen: false,
    proprietaire_occupant: true,
  },
  rga: { sinistres: "saine", indemnise_indemnise_rga: false, demande_catnat_en_cours: false, assure: true },
  menage: { personnes: 2, revenu_rga: 20000 },
};

const parcours = { id: "p1", rgaSimulationData: { logement: { commune: "36044" } }, rgaSimulationDataAgent: null };

describe("chargerEtatEditionSimulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDossiers.mockResolvedValue([]);
    validationEnBase(null);
  });

  it("ne retient qu'une correction d'agent complète", async () => {
    const avecCorrection = { ...parcours, rgaSimulationDataAgent: simulationAgentComplete };
    expect((await chargerEtatEditionSimulation(avecCorrection as never)).simulationCorrigeeParAgent).toBe(true);

    // Dossier créé par un Aller-vers sur la seule adresse : rien à opposer au demandeur.
    const adresseSeule = { ...parcours, rgaSimulationDataAgent: { logement: { adresse: "12 rue de Paris" } } };
    expect((await chargerEtatEditionSimulation(adresseSeule as never)).simulationCorrigeeParAgent).toBe(false);
  });

  it("voit une décision rendue par l'AMO", async () => {
    for (const statut of [
      StatutValidationAmo.LOGEMENT_ELIGIBLE,
      StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
      StatutValidationAmo.ACCOMPAGNEMENT_REFUSE,
    ]) {
      validationEnBase(statut);
      expect((await chargerEtatEditionSimulation(parcours as never)).decisionAmoRendue).toBe(true);
    }
  });

  it("ne voit aucune décision tant que l'AMO n'a pas répondu, ni en autonomie", async () => {
    for (const statut of [StatutValidationAmo.EN_ATTENTE, StatutValidationAmo.SANS_AMO, null]) {
      validationEnBase(statut);
      expect((await chargerEtatEditionSimulation(parcours as never)).decisionAmoRendue).toBe(false);
    }
  });

  it("ne retient que le statut DN de l'étape éligibilité", async () => {
    mockedDossiers.mockResolvedValue([
      { step: Step.DIAGNOSTIC, dsStatus: DSStatus.EN_INSTRUCTION },
      { step: Step.ELIGIBILITE, dsStatus: DSStatus.EN_CONSTRUCTION },
    ] as never);

    expect((await chargerEtatEditionSimulation(parcours as never)).eligibiliteDsStatus).toBe(DSStatus.EN_CONSTRUCTION);
  });
});
