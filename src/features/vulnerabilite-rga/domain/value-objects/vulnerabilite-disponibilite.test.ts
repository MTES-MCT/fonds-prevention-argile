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

    it("active la production quand il vaut « true » : c'est la mise en ligne", () => {
      process.env.NEXT_PUBLIC_APP_ENV = "production";
      process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE = "true";

      expect(isVulnerabiliteRgaActive()).toBe(true);
    });

    it("active aussi une app dont NEXT_PUBLIC_APP_ENV est absente", () => {
      delete process.env.NEXT_PUBLIC_APP_ENV;
      process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE = "true";

      expect(isVulnerabiliteRgaActive()).toBe(true);
    });

    it.each(["TRUE", "1", "oui", ""])(
      "ne publie rien sur la valeur %j : une faute de frappe n'ouvre pas la production",
      (valeur) => {
        process.env.NEXT_PUBLIC_APP_ENV = "production";
        process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE = valeur;

        expect(isVulnerabiliteRgaActive()).toBe(false);
      }
    );

    it("laisse l'environnement décider quand il est absent", () => {
      delete process.env.NEXT_PUBLIC_VULNERABILITE_RGA_ACTIVE;

      process.env.NEXT_PUBLIC_APP_ENV = "staging";
      expect(isVulnerabiliteRgaActive()).toBe(true);

      process.env.NEXT_PUBLIC_APP_ENV = "production";
      expect(isVulnerabiliteRgaActive()).toBe(false);
    });
  });
});
