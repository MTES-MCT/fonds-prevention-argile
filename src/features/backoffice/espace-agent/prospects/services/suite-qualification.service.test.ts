import { describe, it, expect, vi, beforeEach } from "vitest";
import { donnerSuiteAQualificationEligible } from "./suite-qualification.service";
import { assignAmoAutomatiqueForUser, passerEnAutonomie } from "@/features/parcours/amo/services/amo-selection.service";
import { ouvrirEligibiliteApresValidationAmo } from "@/features/parcours/amo/services/ouverture-eligibilite.service";
import { checkAmoCoversCodeInsee } from "@/features/parcours/amo/services/amo-query.service";
import { db } from "@/shared/database/client";
import { AccompagnementSouhaite } from "@/shared/domain/value-objects/accompagnement-souhaite.enum";
import { AttributionAmoMode } from "@/shared/domain/value-objects/attribution-amo-mode.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { emitBrevoEvent } from "@/shared/email/brevo";
import type { ParcoursPrevention } from "@/shared/database/schema";

vi.mock("@/features/parcours/amo/services/amo-selection.service", () => ({
  assignAmoAutomatiqueForUser: vi.fn(async () => ({ success: true, data: { message: "AMO sollicitée", token: "t" } })),
  passerEnAutonomie: vi.fn(async () => ({ success: true, data: { message: "autonomie" } })),
}));

vi.mock("@/features/parcours/amo/services/ouverture-eligibilite.service", () => ({
  ouvrirEligibiliteApresValidationAmo: vi.fn(async () => true),
}));

vi.mock("@/features/parcours/amo/services/amo-query.service", () => ({
  checkAmoCoversCodeInsee: vi.fn(async () => true),
}));

vi.mock("@/shared/database/repositories", () => ({
  entreprisesAmoRepo: { findById: vi.fn(async () => ({ nom: "Soliha", emails: "a@b.fr", telephone: "01" })) },
}));

vi.mock("@/shared/email/brevo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/email/brevo")>()),
  emitBrevoEvent: vi.fn(),
}));

const insertValues = vi.fn();
const insertReturning = vi.fn(async () => [{ id: "validation-1" }]);
vi.mock("@/shared/database/client", () => ({
  db: {
    insert: vi.fn(() => ({
      values: (v: unknown) => {
        insertValues(v);
        return { onConflictDoNothing: () => ({ returning: insertReturning }) };
      },
    })),
  },
}));

/** Dept 03 = AMO imposé par défaut ; dept 82 = AMO facultatif ; aucun cumul AV/AMO par défaut. */
function parcours(commune: string | null): ParcoursPrevention {
  return {
    id: "parcours-1",
    userId: "user-1",
    rgaSimulationData: commune ? { logement: { commune } } : null,
    rgaSimulationDataAgent: null,
  } as never;
}

const AGENT_AMO = { agentId: "agent-1", entrepriseAmoId: "amo-1", aLaCapaciteAmo: true };
const AGENT_AV_PUR = { agentId: "agent-2", entrepriseAmoId: null, aLaCapaciteAmo: false };

describe("donnerSuiteAQualificationEligible — AMO imposé", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertReturning.mockResolvedValue([{ id: "validation-1" }]);
  });

  it("sollicite l'AMO du territoire sans rien demander au demandeur", async () => {
    const suite = await donnerSuiteAQualificationEligible(parcours("03185"), AGENT_AV_PUR);

    expect(suite).toEqual({ issue: "transmise", raison: "AMO sollicitée" });
    expect(assignAmoAutomatiqueForUser).toHaveBeenCalledWith("user-1");
  });

  it("ignore l'intention recueillie : l'AMO y est imposé", async () => {
    const suite = await donnerSuiteAQualificationEligible(
      parcours("03185"),
      AGENT_AV_PUR,
      AccompagnementSouhaite.AUTONOMIE
    );

    expect(suite).toMatchObject({ issue: "transmise" });
    expect(passerEnAutonomie).not.toHaveBeenCalled();
  });

  it("signale une commune inconnue au lieu de décider à l'aveugle", async () => {
    const suite = await donnerSuiteAQualificationEligible(parcours(null), AGENT_AV_PUR);

    expect(suite).toMatchObject({ issue: "echec" });
    expect(assignAmoAutomatiqueForUser).not.toHaveBeenCalled();
  });

  it("remonte l'échec de sollicitation au lieu de le taire", async () => {
    vi.mocked(assignAmoAutomatiqueForUser).mockResolvedValueOnce({ success: false, error: "Aucun AMO disponible" });

    const suite = await donnerSuiteAQualificationEligible(parcours("03185"), AGENT_AV_PUR);

    expect(suite).toEqual({ issue: "echec", raison: "Aucun AMO disponible" });
  });
});

describe("donnerSuiteAQualificationEligible — AMO facultatif, l'Aller-vers tranche", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertReturning.mockResolvedValue([{ id: "validation-1" }]);
  });

  it("accompagnement : sollicite l'AMO du territoire", async () => {
    const suite = await donnerSuiteAQualificationEligible(
      parcours("82013"),
      AGENT_AV_PUR,
      AccompagnementSouhaite.ACCOMPAGNEMENT
    );

    expect(suite).toMatchObject({ issue: "transmise" });
    expect(assignAmoAutomatiqueForUser).toHaveBeenCalledWith("user-1");
  });

  it("autonomie : pose « sans AMO » sans solliciter personne", async () => {
    const suite = await donnerSuiteAQualificationEligible(
      parcours("82013"),
      AGENT_AV_PUR,
      AccompagnementSouhaite.AUTONOMIE
    );

    expect(suite).toMatchObject({ issue: "autonomie" });
    expect(passerEnAutonomie).toHaveBeenCalled();
    expect(assignAmoAutomatiqueForUser).not.toHaveBeenCalled();
  });

  it("ne sait pas : laisse le choix au demandeur, sans rien écrire", async () => {
    const suite = await donnerSuiteAQualificationEligible(
      parcours("82013"),
      AGENT_AV_PUR,
      AccompagnementSouhaite.INCONNU
    );

    expect(suite).toMatchObject({ issue: "laissee_au_demandeur" });
    expect(passerEnAutonomie).not.toHaveBeenCalled();
    expect(assignAmoAutomatiqueForUser).not.toHaveBeenCalled();
  });

  it("question non posée : le demandeur garde la main, comme avant", async () => {
    const suite = await donnerSuiteAQualificationEligible(parcours("82013"), AGENT_AV_PUR);

    expect(suite).toMatchObject({ issue: "laissee_au_demandeur" });
  });

  it("remonte le refus d'autonomie au lieu de le taire", async () => {
    vi.mocked(passerEnAutonomie).mockResolvedValueOnce({
      success: false,
      error: "Un accompagnement a déjà été décidé pour ce dossier",
    });

    const suite = await donnerSuiteAQualificationEligible(
      parcours("82013"),
      AGENT_AV_PUR,
      AccompagnementSouhaite.AUTONOMIE
    );

    expect(suite).toMatchObject({ issue: "echec" });
  });
});

describe("donnerSuiteAQualificationEligible — l'Aller-vers est aussi l'AMO", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    insertReturning.mockResolvedValue([{ id: "validation-1" }]);
    vi.mocked(checkAmoCoversCodeInsee).mockResolvedValue(true);
  });

  /** Le cumul est configuré par env ; le module de règles le lit à son chargement. */
  async function avecCumulSurLe32() {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DEPARTEMENTS_AV_AMO_FUSIONNES", "32");
    vi.stubEnv("NEXT_PUBLIC_DEPARTEMENTS_AMO_OBLIGATOIRE", "03,36,47,54,81");
    return (await import("./suite-qualification.service")).donnerSuiteAQualificationEligible;
  }

  it("vaut validation AMO : pas de sollicitation, donc pas d'email de demande", async () => {
    const donnerSuite = await avecCumulSurLe32();

    const suite = await donnerSuite(parcours("32013"), AGENT_AMO, AccompagnementSouhaite.ACCOMPAGNEMENT, true);

    expect(suite).toMatchObject({ issue: "validee_par_la_structure" });
    expect(assignAmoAutomatiqueForUser).not.toHaveBeenCalled();
  });

  it("rattache l'entreprise de l'agent et reprend son engagement de mandataire", async () => {
    const donnerSuite = await avecCumulSurLe32();

    await donnerSuite(parcours("32013"), AGENT_AMO, AccompagnementSouhaite.ACCOMPAGNEMENT, true);

    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        entrepriseAmoId: "amo-1",
        statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
        attributionMode: AttributionAmoMode.AUTO_AV_AMO,
        estMandataireFinancier: true,
        valideeAt: expect.any(Date),
      })
    );
  });

  it("ouvre l'étape éligibilité et annonce la réponse AMO", async () => {
    const donnerSuite = await avecCumulSurLe32();

    await donnerSuite(parcours("32013"), AGENT_AMO, AccompagnementSouhaite.ACCOMPAGNEMENT);

    expect(ouvrirEligibiliteApresValidationAmo).toHaveBeenCalledWith("parcours-1");
    expect(emitBrevoEvent).toHaveBeenCalledWith("parcours-1", "amo_reponse", expect.anything());
  });

  it("ne vaut pas validation pour un Aller-vers sans casquette AMO", async () => {
    const donnerSuite = await avecCumulSurLe32();

    const suite = await donnerSuite(parcours("32013"), AGENT_AV_PUR, AccompagnementSouhaite.ACCOMPAGNEMENT);

    expect(suite).toMatchObject({ issue: "transmise" });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("ne vaut pas validation si l'entreprise de l'agent ne couvre pas la commune", async () => {
    const donnerSuite = await avecCumulSurLe32();
    vi.mocked(checkAmoCoversCodeInsee).mockResolvedValue(false);

    const suite = await donnerSuite(parcours("32013"), AGENT_AMO, AccompagnementSouhaite.ACCOMPAGNEMENT);

    expect(suite).toMatchObject({ issue: "transmise" });
  });

  it("ne vaut pas validation dans un département sans cumul AV/AMO", async () => {
    const suite = await donnerSuiteAQualificationEligible(
      parcours("82013"),
      AGENT_AMO,
      AccompagnementSouhaite.ACCOMPAGNEMENT
    );

    expect(suite).toMatchObject({ issue: "transmise" });
  });

  it("n'écrase pas une décision d'accompagnement déjà prise", async () => {
    const donnerSuite = await avecCumulSurLe32();
    insertReturning.mockResolvedValue([]);

    const suite = await donnerSuite(parcours("32013"), AGENT_AMO, AccompagnementSouhaite.ACCOMPAGNEMENT);

    expect(suite).toMatchObject({ issue: "echec" });
    expect(ouvrirEligibiliteApresValidationAmo).not.toHaveBeenCalled();
  });
});
