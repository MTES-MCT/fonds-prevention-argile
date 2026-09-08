import { describe, it, expect, afterEach } from "vitest";
import { isVulnerabiliteRgaActive } from "./vulnerabilite-disponibilite";

const ENV_INITIAL = process.env.NEXT_PUBLIC_APP_ENV;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_ENV = ENV_INITIAL;
});

describe("isVulnerabiliteRgaActive", () => {
  it.each(["local", "docker", "staging"])("actif en %s", (env) => {
    process.env.NEXT_PUBLIC_APP_ENV = env;

    expect(isVulnerabiliteRgaActive()).toBe(true);
  });

  it("inactif en production tant que la grille n'est pas validée (ADR-0030)", () => {
    process.env.NEXT_PUBLIC_APP_ENV = "production";

    expect(isVulnerabiliteRgaActive()).toBe(false);
  });

  it("inactif si la variable est absente : l'oubli de configuration ne doit pas ouvrir", () => {
    delete process.env.NEXT_PUBLIC_APP_ENV;

    expect(isVulnerabiliteRgaActive()).toBe(false);
  });

  it("inactif sur une valeur inconnue", () => {
    process.env.NEXT_PUBLIC_APP_ENV = "preprod";

    expect(isVulnerabiliteRgaActive()).toBe(false);
  });
});
