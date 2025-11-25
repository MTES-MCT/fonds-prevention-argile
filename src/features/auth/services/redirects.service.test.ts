import { describe, it, expect } from "vitest";
import { getDefaultRedirect, getUnauthorizedRedirect, getPostLoginRedirect } from "./redirects.service";
import { ROLES } from "../domain/value-objects/constants";

describe("redirects.service", () => {
  describe("getDefaultRedirect", () => {
    it("devrait retourner /administration pour le rôle ADMIN", () => {
      expect(getDefaultRedirect(ROLES.ADMIN)).toBe("/administration");
    });

    it("devrait retourner /administration pour le rôle INSTRUCTEUR", () => {
      expect(getDefaultRedirect(ROLES.INSTRUCTEUR)).toBe("/administration");
    });

    it("devrait retourner /administration pour le rôle AMO", () => {
      expect(getDefaultRedirect(ROLES.AMO)).toBe("/administration");
    });

    it("devrait retourner /mon-compte pour le rôle PARTICULIER", () => {
      expect(getDefaultRedirect(ROLES.PARTICULIER)).toBe("/mon-compte");
    });

    it("devrait retourner / pour un rôle inconnu", () => {
      // @ts-expect-error - Test avec une valeur invalide intentionnellement
      expect(getDefaultRedirect("unknown_role")).toBe("/");
    });
  });

  describe("getUnauthorizedRedirect", () => {
    it("devrait rediriger vers /connexion si aucun rôle", () => {
      expect(getUnauthorizedRedirect()).toBe("/connexion");
      expect(getUnauthorizedRedirect(undefined)).toBe("/connexion");
    });

    it("devrait rediriger ADMIN vers /administration", () => {
      expect(getUnauthorizedRedirect(ROLES.ADMIN)).toBe("/administration");
    });

    it("devrait rediriger INSTRUCTEUR vers /administration", () => {
      expect(getUnauthorizedRedirect(ROLES.INSTRUCTEUR)).toBe("/administration");
    });

    it("devrait rediriger AMO vers /administration", () => {
      expect(getUnauthorizedRedirect(ROLES.AMO)).toBe("/administration");
    });

    it("devrait rediriger PARTICULIER vers /mon-compte", () => {
      expect(getUnauthorizedRedirect(ROLES.PARTICULIER)).toBe("/mon-compte");
    });

    it("devrait rediriger un rôle inconnu vers /", () => {
      // @ts-expect-error - Test avec une valeur invalide intentionnellement
      expect(getUnauthorizedRedirect("unknown_role")).toBe("/");
    });
  });

  describe("getPostLoginRedirect", () => {
    describe("Avec un chemin cible (intendedPath)", () => {
      it("devrait rediriger ADMIN vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN, "/test")).toBe("/test");
        expect(getPostLoginRedirect(ROLES.ADMIN, "/administration/users")).toBe("/administration/users");
      });

      it("devrait rediriger INSTRUCTEUR vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.INSTRUCTEUR, "/test")).toBe("/test");
      });

      it("devrait rediriger AMO vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.AMO, "/test")).toBe("/test");
      });

      it("devrait rediriger PARTICULIER vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/mes-dossiers")).toBe("/mes-dossiers");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/mon-compte/profile")).toBe("/mon-compte/profile");
      });

      it("devrait rediriger vers le chemin cible même si c'est une route publique", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN, "/mentions-legales")).toBe("/mentions-legales");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/cgu")).toBe("/cgu");
      });

      it("ne devrait pas rediriger vers / si intendedPath est /", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN, "/")).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.INSTRUCTEUR, "/")).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.AMO, "/")).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/")).toBe("/mon-compte");
      });
    });

    describe("Sans chemin cible (intendedPath)", () => {
      it("devrait rediriger ADMIN vers /administration par défaut", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN)).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.ADMIN, undefined)).toBe("/administration");
      });

      it("devrait rediriger INSTRUCTEUR vers /administration par défaut", () => {
        expect(getPostLoginRedirect(ROLES.INSTRUCTEUR)).toBe("/administration");
      });

      it("devrait rediriger AMO vers /administration par défaut", () => {
        expect(getPostLoginRedirect(ROLES.AMO)).toBe("/administration");
      });

      it("devrait rediriger PARTICULIER vers /mon-compte par défaut", () => {
        expect(getPostLoginRedirect(ROLES.PARTICULIER)).toBe("/mon-compte");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, undefined)).toBe("/mon-compte");
      });
    });

    describe("Cas edge", () => {
      it("devrait gérer une chaîne vide comme intendedPath", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN, "")).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.INSTRUCTEUR, "")).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.AMO, "")).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "")).toBe("/mon-compte");
      });

      it("devrait gérer un chemin cible complexe", () => {
        const complexPath = "/mes-dossiers/123/documents?filter=recent";
        expect(getPostLoginRedirect(ROLES.PARTICULIER, complexPath)).toBe(complexPath);
      });

      it("devrait gérer un rôle inconnu sans intendedPath", () => {
        // @ts-expect-error - Test avec une valeur invalide intentionnellement
        expect(getPostLoginRedirect("unknown_role")).toBe("/");
      });

      it("devrait gérer un rôle inconnu avec intendedPath", () => {
        // @ts-expect-error - Test avec une valeur invalide intentionnellement
        expect(getPostLoginRedirect("unknown_role", "/test")).toBe("/test");
      });
    });
  });
});
