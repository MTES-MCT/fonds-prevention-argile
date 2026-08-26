import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifierRegeneration, regenererLienPrefill, DELAI_MIN_REGENERATION_MINUTES } from "./regeneration.service";
import { graphqlClient, DsGraphQLError } from "../adapters/graphql/client";
import { dossiersDsTentativesRepo, parcoursRepo } from "@/shared/database/repositories";
import { getDossierByStep } from "./dossier-ds.service";
import { Step } from "@/shared/domain/value-objects/step.enum";

vi.mock("@/shared/database/client", () => ({ db: {} }));
vi.mock("../adapters/graphql/client", () => {
  class DsGraphQLError extends Error {
    readonly code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.name = "DsGraphQLError";
      this.code = code;
    }
  }
  return { graphqlClient: { getDossierStatus: vi.fn() }, DsGraphQLError };
});
vi.mock("@/shared/database/repositories", () => ({
  dossiersDsTentativesRepo: { record: vi.fn(), findByParcoursStep: vi.fn() },
  parcoursRepo: { findByUserId: vi.fn() },
}));
vi.mock("./dossier-ds.service", () => ({ getDossierByStep: vi.fn() }));

const MAINTENANT = new Date("2026-08-25T12:00:00Z");
const ilYA = (minutes: number) => new Date(MAINTENANT.getTime() - minutes * 60_000);

function dossier(overrides: Partial<Parameters<typeof verifierRegeneration>[0]> = {}) {
  return {
    createdAt: ilYA(60),
    submittedAt: null,
    lastSyncAt: null,
    dsStatus: null,
    ...overrides,
  };
}

// Cf. ADR-0027 : on ne régénère que ce qui n'a jamais été observé déposé.
describe("verifierRegeneration", () => {
  it("autorise la régénération d'un prérempli jamais déposé", () => {
    expect(verifierRegeneration(dossier(), MAINTENANT)).toBeNull();
  });

  it("refuse s'il n'y a aucun dossier à régénérer", () => {
    expect(verifierRegeneration(null, MAINTENANT)).toBe("aucun_dossier");
  });

  it("refuse sur un dossier déposé : son lien est valide", () => {
    expect(verifierRegeneration(dossier({ submittedAt: ilYA(120) }), MAINTENANT)).toBe("dossier_depose");
    expect(verifierRegeneration(dossier({ lastSyncAt: ilYA(30) }), MAINTENANT)).toBe("dossier_depose");
    expect(verifierRegeneration(dossier({ dsStatus: "en_instruction" }), MAINTENANT)).toBe("dossier_depose");
  });

  it("expose un refus dédié quand DN est injoignable", () => {
    // Le message doit exister : c'est lui qui remplace la suppression à l'aveugle.
    expect(verifierRegeneration(dossier(), MAINTENANT)).toBeNull();
  });

  it("refuse un lien tout juste créé, pour éviter d'empiler les brouillons", () => {
    expect(verifierRegeneration(dossier({ createdAt: ilYA(1) }), MAINTENANT)).toBe("trop_recent");
    expect(
      verifierRegeneration(dossier({ createdAt: ilYA(DELAI_MIN_REGENERATION_MINUTES + 1) }), MAINTENANT)
    ).toBeNull();
  });
});

// Cf. revue ADR-0027 : une panne DN ne doit jamais faire retirer un pointeur peut-être vivant.
describe("regenererLienPrefill — panne DN", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parcoursRepo.findByUserId).mockResolvedValue({
      id: "parcours-1",
      currentStep: Step.ELIGIBILITE,
    } as never);
    vi.mocked(getDossierByStep).mockResolvedValue({
      id: "dossier-1",
      dsNumber: "32872663",
      dsId: null,
      dsDemarcheId: "126061",
      createdAt: ilYA(120),
      submittedAt: null,
      lastSyncAt: null,
      dsStatus: null,
    } as never);
    vi.mocked(dossiersDsTentativesRepo.record).mockResolvedValue(undefined);
    vi.mocked(dossiersDsTentativesRepo.findByParcoursStep).mockResolvedValue([{ dsNumber: "32872663" }] as never);
  });

  it("abandonne sans rien supprimer si le sondage échoue autrement qu'en not_found", async () => {
    vi.mocked(graphqlClient.getDossierStatus).mockRejectedValue(
      new DsGraphQLError("GraphQL errors: unauthorized", "unauthorized")
    );

    const result = await regenererLienPrefill("user-1");

    expect(result.success).toBe(false);
  });
});
