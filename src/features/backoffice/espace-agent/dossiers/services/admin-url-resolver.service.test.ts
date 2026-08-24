import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/shared/database/client";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";

vi.mock("@/shared/database/client", () => ({
  db: { select: vi.fn() },
}));
vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: vi.fn(() => ({ BASE_URL: "https://app.test" })),
}));

import { resolveEspaceAgentPath, resolveAdminUrl } from "./admin-url-resolver.service";

const PARCOURS_ID = "11111111-1111-4111-8111-111111111111";
const VALIDATION_ID = "22222222-2222-4222-8222-222222222222";

function mockSelectOnce(rows: unknown[]) {
  vi.mocked(db.select).mockReturnValueOnce({
    from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

/** 1er select = parcours, 2e select = validation. */
function mockParcoursThenValidation(parcours: unknown[], validation: unknown[]) {
  mockSelectOnce(parcours);
  mockSelectOnce(validation);
}

describe("resolveEspaceAgentPath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renvoie la page dossier pour une validation tranchée", async () => {
    mockParcoursThenValidation(
      [{ id: PARCOURS_ID, archivedAt: null }],
      [{ id: VALIDATION_ID, statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entrepriseAmoId: "e1" }]
    );

    expect(await resolveEspaceAgentPath(PARCOURS_ID)).toBe(`/espace-agent/dossiers/${VALIDATION_ID}`);
  });

  it("renvoie la page dossier pour un parcours sans AMO", async () => {
    mockParcoursThenValidation(
      [{ id: PARCOURS_ID, archivedAt: null }],
      [{ id: VALIDATION_ID, statut: StatutValidationAmo.SANS_AMO, entrepriseAmoId: null }]
    );

    expect(await resolveEspaceAgentPath(PARCOURS_ID)).toBe(`/espace-agent/dossiers/${VALIDATION_ID}`);
  });

  it("renvoie la page demande quand l'AMO doit encore se prononcer", async () => {
    mockParcoursThenValidation(
      [{ id: PARCOURS_ID, archivedAt: null }],
      [{ id: VALIDATION_ID, statut: StatutValidationAmo.EN_ATTENTE, entrepriseAmoId: "e1" }]
    );

    expect(await resolveEspaceAgentPath(PARCOURS_ID)).toBe(`/espace-agent/demandes/${VALIDATION_ID}`);
  });

  it("renvoie la page prospect quand aucune validation n'existe", async () => {
    mockParcoursThenValidation([{ id: PARCOURS_ID, archivedAt: null }], []);

    expect(await resolveEspaceAgentPath(PARCOURS_ID)).toBe(`/espace-agent/prospects/${PARCOURS_ID}`);
  });

  it("renvoie null si le parcours n'existe pas", async () => {
    mockSelectOnce([]);

    expect(await resolveEspaceAgentPath(PARCOURS_ID)).toBeNull();
  });

  // Le resolver est appelé avec un segment d'URL arbitraire : sans garde, Postgres
  // rejette l'uuid invalide et la page rend un 500 au lieu d'un 404.
  it("renvoie null sans requêter la base sur un id non-uuid", async () => {
    expect(await resolveEspaceAgentPath("pas-un-uuid")).toBeNull();
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe("resolveAdminUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("préfixe le chemin résolu par BASE_URL", async () => {
    mockParcoursThenValidation(
      [{ id: PARCOURS_ID, archivedAt: null }],
      [{ id: VALIDATION_ID, statut: StatutValidationAmo.LOGEMENT_ELIGIBLE, entrepriseAmoId: "e1" }]
    );

    expect(await resolveAdminUrl(PARCOURS_ID)).toBe(`https://app.test/espace-agent/dossiers/${VALIDATION_ID}`);
  });

  it("reste null si le parcours n'existe pas (pas de BASE_URL orpheline)", async () => {
    mockSelectOnce([]);

    expect(await resolveAdminUrl(PARCOURS_ID)).toBeNull();
  });
});
