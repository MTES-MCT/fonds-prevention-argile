import { describe, it, expect, afterEach } from "vitest";
import { isVulnerabiliteRgaActive } from "./vulnerabilite-disponibilite";

const ENV_INITIAL = process.env.NEXT_PUBLIC_APP_ENV;
const INTERRUPTEUR_INITIAL = process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE;

afterEach(() => {
  process.env.NEXT_PUBLIC_APP_ENV = ENV_INITIAL;
  if (INTERRUPTEUR_INITIAL === undefined) delete process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE;
  else process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE = INTERRUPTEUR_INITIAL;
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

  describe("interrupteur NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE", () => {
    it("désactive tout en staging quand il vaut « false »", () => {
      process.env.NEXT_PUBLIC_APP_ENV = "staging";
      process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE = "false";

      expect(isVulnerabiliteRgaActive()).toBe(false);
    });

    it("n'active jamais la production, même à « true »", () => {
      process.env.NEXT_PUBLIC_APP_ENV = "production";
      process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE = "true";

      expect(isVulnerabiliteRgaActive()).toBe(false);
    });

    it("laisse l'environnement décider quand il vaut « true » ou est absent", () => {
      process.env.NEXT_PUBLIC_APP_ENV = "staging";
      process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE = "true";
      expect(isVulnerabiliteRgaActive()).toBe(true);

      delete process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE;
      expect(isVulnerabiliteRgaActive()).toBe(true);
    });
  });
});
