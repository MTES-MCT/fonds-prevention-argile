import { describe, it, expect } from "vitest";
import {
  getDefaultRedirect,
  getUnauthorizedRedirect,
  getPostLoginRedirect,
} from "./redirects.service";
import { ROLES } from "../domain/value-objects/constants";

describe("redirects.service", () => {
  describe("getDefaultRedirect", () => {
    it("devrait retourner /administration pour le rôle admin", () => {
      expect(getDefaultRedirect(ROLES.ADMIN)).toBe("/administration");
    });

    it("devrait retourner /mon-compte pour le rôle particulier", () => {
      expect(getDefaultRedirect(ROLES.PARTICULIER)).toBe("/mon-compte");
    });

    it("devrait gérer un rôle inconnu", () => {
      // Le service retourne /mon-compte par défaut si le rôle n'est pas admin
      expect(getDefaultRedirect("unknown_role" as any)).toBe("/mon-compte");
    });
  });

  describe("getUnauthorizedRedirect", () => {
    it("devrait rediriger vers /connexion si aucun rôle", () => {
      expect(getUnauthorizedRedirect()).toBe("/connexion");
      expect(getUnauthorizedRedirect(undefined)).toBe("/connexion");
    });

    it("devrait rediriger l'admin vers sa page par défaut", () => {
      expect(getUnauthorizedRedirect(ROLES.ADMIN)).toBe("/administration");
    });

    it("devrait rediriger le particulier vers sa page par défaut", () => {
      expect(getUnauthorizedRedirect(ROLES.PARTICULIER)).toBe("/mon-compte");
    });

    it("devrait gérer un rôle inconnu", () => {
      // Si un rôle est fourni, même inconnu, on redirige vers la page par défaut
      expect(getUnauthorizedRedirect("unknown_role" as any)).toBe(
        "/mon-compte"
      );
    });
  });

  describe("getPostLoginRedirect", () => {
    describe("Avec un chemin cible (intendedPath)", () => {
      it("devrait rediriger admin vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN, "/test")).toBe("/test");
        expect(getPostLoginRedirect(ROLES.ADMIN, "/administration/users")).toBe(
          "/administration/users"
        );
      });

      it("devrait rediriger particulier vers le chemin cible", () => {
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/mes-dossiers")).toBe(
          "/mes-dossiers"
        );
        expect(
          getPostLoginRedirect(ROLES.PARTICULIER, "/mon-compte/profile")
        ).toBe("/mon-compte/profile");
      });

      it("devrait rediriger vers le chemin cible même si c'est une route publique", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN, "/mentions-legales")).toBe(
          "/mentions-legales"
        );
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/cgu")).toBe("/cgu");
      });

      it("ne devrait pas rediriger vers / si intendedPath est /", () => {
        // Si intendedPath est "/", on utilise la redirection par défaut
        expect(getPostLoginRedirect(ROLES.ADMIN, "/")).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "/")).toBe(
          "/mon-compte"
        );
      });
    });

    describe("Sans chemin cible (intendedPath)", () => {
      it("devrait rediriger admin vers /administration par défaut", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN)).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.ADMIN, undefined)).toBe(
          "/administration"
        );
      });

      it("devrait rediriger particulier vers /mon-compte par défaut", () => {
        expect(getPostLoginRedirect(ROLES.PARTICULIER)).toBe("/mon-compte");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, undefined)).toBe(
          "/mon-compte"
        );
      });
    });

    describe("Cas edge", () => {
      it("devrait gérer une chaîne vide comme intendedPath", () => {
        expect(getPostLoginRedirect(ROLES.ADMIN, "")).toBe("/administration");
        expect(getPostLoginRedirect(ROLES.PARTICULIER, "")).toBe("/mon-compte");
      });

      it("devrait gérer un chemin cible complexe", () => {
        const complexPath = "/mes-dossiers/123/documents?filter=recent";
        expect(getPostLoginRedirect(ROLES.PARTICULIER, complexPath)).toBe(
          complexPath
        );
      });

      it("devrait gérer un rôle inconnu sans intendedPath", () => {
        // Rôle inconnu → redirection par défaut vers /mon-compte
        expect(getPostLoginRedirect("unknown_role" as any)).toBe("/mon-compte");
      });

      it("devrait gérer un rôle inconnu avec intendedPath", () => {
        // Même avec un rôle inconnu, si intendedPath est fourni, on l'utilise
        expect(getPostLoginRedirect("unknown_role" as any, "/test")).toBe(
          "/test"
        );
      });
    });
  });
});
