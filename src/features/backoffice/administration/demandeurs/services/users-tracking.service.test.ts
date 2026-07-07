import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock minimal de la chaîne Drizzle : on contrôle les lignes renvoyées par orderBy
// pour vérifier le filtrage territorial fait en JS dans le service.
const { rowsHolder } = vi.hoisted(() => ({ rowsHolder: { rows: [] as unknown[] } }));

vi.mock("@/shared/database/client", () => {
  const chain: Record<string, unknown> = {};
  chain.from = () => chain;
  chain.leftJoin = () => chain;
  chain.where = () => chain;
  chain.orderBy = () => Promise.resolve(rowsHolder.rows);
  return { db: { select: () => chain } };
});

import { getUsersWithParcours, toStatsProjection } from "./users-tracking.service";
import type { UserWithParcoursDetails } from "../domain/types/user-with-parcours.types";

function row(userId: string, codeDepartement: string) {
  return {
    userId,
    parcoursId: `parcours-${userId}`,
    parcoursRgaSimulationData: { logement: { code_departement: codeDepartement } },
    parcoursRgaSimulationDataAgent: null,
  };
}

describe("getUsersWithParcours — filtrage territorial", () => {
  beforeEach(() => {
    rowsHolder.rows = [row("u-36", "36"), row("u-75", "75")];
  });

  it("ne renvoie que les demandeurs du département scopé (analyste départemental)", async () => {
    const users = await getUsersWithParcours({ departements: ["36"] });
    expect(users.map((u) => u.user.id)).toEqual(["u-36"]);
  });

  it("renvoie tous les demandeurs sans filtre (analyste national / admin)", async () => {
    const users = await getUsersWithParcours(null);
    expect(users.map((u) => u.user.id).sort()).toEqual(["u-36", "u-75"]);
  });

  it("ne renvoie rien si noAccess", async () => {
    const users = await getUsersWithParcours({ noAccess: true });
    expect(users).toEqual([]);
  });
});

describe("toStatsProjection — anonymisation des cas nuls (ADR-0017)", () => {
  it("gère un demandeur minimal (parcours/validation/simulation absents) sans planter", () => {
    const minimal = {
      user: {
        id: "u-1",
        fcId: "fc-secret",
        email: "a@b.fr",
        name: "D.",
        firstName: "Jean",
        telephone: "0600000000",
        sourceAcquisition: null,
        sourceAcquisitionPrecision: null,
        partnerSource: null,
        lastLogin: new Date("2024-01-01"),
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      parcours: null,
      rgaSimulation: null,
      amoValidation: null,
      dossiers: { eligibilite: null, diagnostic: null, devis: null, factures: null },
    } as UserWithParcoursDetails;

    const projected = toStatsProjection(minimal);

    // Identité retirée même sur un objet minimal
    expect(projected.user.fcId).toBeNull();
    expect(projected.user.firstName).toBeNull();
    expect(projected.user.email).toBeNull();
    // Les branches nulles restent nulles (pas d'accès à des sous-champs undefined)
    expect(projected.rgaSimulation).toBeNull();
    expect(projected.amoValidation).toBeNull();
    expect(projected.dossiers.eligibilite).toBeNull();
  });
});
