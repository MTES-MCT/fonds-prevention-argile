import { describe, it, expect } from "vitest";
import { getDefaultRedirect, getUnauthorizedRedirect, getPostLoginRedirect } from "./redirects.service";
import { ROLES } from "../domain/value-objects/constants";
import { DEFAULT_REDIRECTS } from "../domain/value-objects/configs/routes.config";

describe("redirects.service", () => {
  describe("getDefaultRedirect", () => {
    it("devrait retourner /administration pour le rôle ADMIN", () => {
      expect(getDefaultRedirect(ROLES.ADMINISTRATEUR)).toBe(DEFAULT_REDIRECTS.administrateur);
    });

    it("devrait retourner /instruction pour le rôle SUPER_ADMINISTRATEUR", () => {
      expect(getDefaultRedirect(ROLES.SUPER_ADMINISTRATEUR)).toBe(DEFAULT_REDIRECTS.super_administrateur);
    });

    it("devrait retourner /espace-agent pour le rôle AMO", () => {
      expect(getDefaultRedirect(ROLES.AMO)).toBe(DEFAULT_REDIRECTS.amo);
    });

    it("devrait retourner /mon-compte pour le rôle PARTICULIER", () => {
      expect(getDefaultRedirect(ROLES.PARTICULIER)).toBe(DEFAULT_REDIRECTS.particulier);
    });

    it("devrait retourner / pour un rôle inconnu", () => {
      // @ts-expect-error - Test avec une valeur invalide intentionnellement
      expect(getDefaultRedirect("unknown_role")).toBe(DEFAULT_REDIRECTS.home);
    });
  });

  describe("getUnauthorizedRedirect", () => {
    it("devrait rediriger vers /connexion si aucun rôle", () => {
      expect(getUnauthorizedRedirect()).toBe(DEFAULT_REDIRECTS.login);
      expect(getUnauthorizedRedirect(undefined)).toBe(DEFAULT_REDIRECTS.login);
    });

    it("devrait rediriger ADMIN vers /administration", () => {
      expect(getUnauthorizedRedirect(ROLES.ADMINISTRATEUR)).toBe(DEFAULT_REDIRECTS.administrateur);
    });

    it("devrait rediriger SUPER_ADMINISTRATEUR vers /administation", () => {
      expect(getUnauthorizedRedirect(ROLES.SUPER_ADMINISTRATEUR)).toBe(DEFAULT_REDIRECTS.super_administrateur);
    });

    it("devrait rediriger AMO vers /espace-agent", () => {
      expect(getUnauthorizedRedirect(ROLES.AMO)).toBe(DEFAULT_REDIRECTS.amo);
    });

    it("devrait rediriger PARTICULIER vers /mon-compte", () => {
      expect(getUnauthorizedRedirect(ROLES.PARTICULIER)).toBe(DEFAULT_REDIRECTS.particulier);
    });

    it("devrait rediriger un rôle inconnu vers /", () => {
      // @ts-expect-error - Test avec une valeur invalide intentionnellement
      expect(getUnauthorizedRedirect("unknown_role")).toBe(DEFAULT_REDIRECTS.home);
    });
  });

  describe("getPostLoginRedirect", () => {
    describe("Avec un chemin cible (intendedPath)", () => {
      it("devrait rediriger ADMINISTRATEUR vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.ADMINISTRATEUR, "/test")).toBe("/test");
        expect(getPostLoginRedirect(ROLES.ADMINISTRATEUR, "/administration/users")).toBe("/administration/users");
      });

      it("devrait rediriger SUPER_ADMINISTRATEUR vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.SUPER_ADMINISTRATEUR, "/test")).toBe("/test");
      });

      it("devrait rediriger AMO vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.AMO, "/test")).toBe("/test");
      });

      it("devrait rediriger PARTICULIER vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/mes-dossiers")).toBe("/mes-dossiers");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/mon-compte/profile")).toBe("/mon-compte/profile");
      });

      it("devrait rediriger vers le chemin cible même si c'est une route publique", () => {
        expect(getPostLoginRedirect(ROLES.ADMINISTRATEUR, "/mentions-legales")).toBe("/mentions-legales");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/cgu")).toBe("/cgu");
      });

      it("ne devrait pas rediriger vers / si intendedPath est /", () => {
        expect(getPostLoginRedirect(ROLES.ADMINISTRATEUR, "/")).toBe(DEFAULT_REDIRECTS.administrateur);
        expect(getPostLoginRedirect(ROLES.SUPER_ADMINISTRATEUR, "/")).toBe(DEFAULT_REDIRECTS.super_administrateur);
        expect(getPostLoginRedirect(ROLES.AMO, "/")).toBe(DEFAULT_REDIRECTS.amo);
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/")).toBe(DEFAULT_REDIRECTS.particulier);
      });
    });

    describe("Sans chemin cible (intendedPath)", () => {
      it("devrait rediriger ADMINISTRATEUR vers /administration par défaut", () => {
        expect(getPostLoginRedirect(ROLES.ADMINISTRATEUR)).toBe(DEFAULT_REDIRECTS.administrateur);
        expect(getPostLoginRedirect(ROLES.ADMINISTRATEUR, undefined)).toBe(DEFAULT_REDIRECTS.administrateur);
      });

      it("devrait rediriger SUPER_ADMINISTRATEUR vers /administration par défaut", () => {
        expect(getPostLoginRedirect(ROLES.SUPER_ADMINISTRATEUR)).toBe(DEFAULT_REDIRECTS.super_administrateur);
      });

      it("devrait rediriger AMO vers /espace-agent par défaut", () => {
        expect(getPostLoginRedirect(ROLES.AMO)).toBe(DEFAULT_REDIRECTS.amo);
      });

      it("devrait rediriger PARTICULIER vers /mon-compte par défaut", () => {
        expect(getPostLoginRedirect(ROLES.PARTICULIER)).toBe(DEFAULT_REDIRECTS.particulier);
        expect(getPostLoginRedirect(ROLES.PARTICULIER, undefined)).toBe(DEFAULT_REDIRECTS.particulier);
      });
    });

    describe("Cas edge", () => {
      it("devrait gérer une chaîne vide comme intendedPath", () => {
        expect(getPostLoginRedirect(ROLES.ADMINISTRATEUR, "")).toBe(DEFAULT_REDIRECTS.administrateur);
        expect(getPostLoginRedirect(ROLES.SUPER_ADMINISTRATEUR, "")).toBe(DEFAULT_REDIRECTS.super_administrateur);
        expect(getPostLoginRedirect(ROLES.AMO, "")).toBe(DEFAULT_REDIRECTS.amo);
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "")).toBe(DEFAULT_REDIRECTS.particulier);
      });

      it("devrait gérer un chemin cible complexe", () => {
        const complexPath = "/mes-dossiers/123/documents?filter=recent";
        expect(getPostLoginRedirect(ROLES.PARTICULIER, complexPath)).toBe(complexPath);
      });

      it("devrait gérer un rôle inconnu sans intendedPath", () => {
        // @ts-expect-error - Test avec une valeur invalide intentionnellement
        expect(getPostLoginRedirect("unknown_role")).toBe(DEFAULT_REDIRECTS.home);
      });

      it("devrait gérer un rôle inconnu avec intendedPath", () => {
        // @ts-expect-error - Test avec une valeur invalide intentionnellement
        expect(getPostLoginRedirect("unknown_role", "/test")).toBe("/test");
      });
    });
  });
});
