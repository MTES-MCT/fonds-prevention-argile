import { describe, it, expect, vi } from "vitest";
import { verifierRegeneration, DELAI_MIN_REGENERATION_MINUTES } from "./regeneration.service";

vi.mock("@/shared/database/client", () => ({ db: {} }));
vi.mock("../adapters/graphql/client", () => ({ graphqlClient: { getDossierStatus: vi.fn() } }));

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

  it("refuse un lien tout juste créé, pour éviter d'empiler les brouillons", () => {
    expect(verifierRegeneration(dossier({ createdAt: ilYA(1) }), MAINTENANT)).toBe("trop_recent");
    expect(
      verifierRegeneration(dossier({ createdAt: ilYA(DELAI_MIN_REGENERATION_MINUTES + 1) }), MAINTENANT)
    ).toBeNull();
  });
});
