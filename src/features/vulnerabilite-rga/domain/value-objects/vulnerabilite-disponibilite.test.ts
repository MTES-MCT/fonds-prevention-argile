import { describe, it, expect, vi, beforeEach } from "vitest";
import { isProduction } from "@/shared/config/env.config";
import { isVulnerabiliteRgaActive } from "./vulnerabilite-disponibilite";

vi.mock("@/shared/config/env.config", () => ({ isProduction: vi.fn() }));

const mockedIsProduction = vi.mocked(isProduction);

describe("isVulnerabiliteRgaActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("actif hors production (local, docker, staging)", () => {
    mockedIsProduction.mockReturnValue(false);

    expect(isVulnerabiliteRgaActive()).toBe(true);
  });

  it("inactif en production tant que la grille n'est pas validée (ADR-0030)", () => {
    mockedIsProduction.mockReturnValue(true);

    expect(isVulnerabiliteRgaActive()).toBe(false);
  });
});
