import { describe, it, expect } from "vitest";
import { isAdminRoute, isParticulierRoute, isProtectedRoute, canAccessRoute } from "./routes.service";
import { ROLES } from "../domain/value-objects/constants";

describe("routes.service", () => {
  describe("isAdminRoute", () => {
    it("devrait identifier les routes admin", () => {
      expect(isAdminRoute("/administration")).toBe(true);
      expect(isAdminRoute("/administration/users")).toBe(true);
      expect(isAdminRoute("/administration/settings/profile")).toBe(true);
    });

    it("devrait identifier les routes API privées comme admin", () => {
      expect(isAdminRoute("/api/private")).toBe(true);
      expect(isAdminRoute("/api/private/users")).toBe(true);
    });

    it("devrait identifier les routes de test comme admin", () => {
      expect(isAdminRoute("/test")).toBe(true);
      expect(isAdminRoute("/test/debug")).toBe(true);
    });

    it("devrait rejeter les routes non-admin", () => {
      expect(isAdminRoute("/mon-compte")).toBe(false);
      expect(isAdminRoute("/connexion")).toBe(false);
      expect(isAdminRoute("/")).toBe(false);
      expect(isAdminRoute("/mentions-legales")).toBe(false);
    });

    it("devrait gérer les cas edge", () => {
      expect(isAdminRoute("")).toBe(false);
      expect(isAdminRoute("/")).toBe(false);
      expect(isAdminRoute("/admin")).toBe(false);
    });
  });

  describe("isParticulierRoute", () => {
    it("devrait identifier les routes particulier", () => {
      expect(isParticulierRoute("/mon-compte")).toBe(true);
      expect(isParticulierRoute("/mon-compte/profile")).toBe(true);
      expect(isParticulierRoute("/mon-compte/settings")).toBe(true);
    });

    it("devrait identifier les routes mes-dossiers", () => {
      expect(isParticulierRoute("/mes-dossiers")).toBe(true);
      expect(isParticulierRoute("/mes-dossiers/123")).toBe(true);
    });

    it("devrait identifier les routes mes-demandes", () => {
      expect(isParticulierRoute("/mes-demandes")).toBe(true);
      expect(isParticulierRoute("/mes-demandes/nouvelle")).toBe(true);
    });

    it("devrait rejeter les routes non-particulier", () => {
      expect(isParticulierRoute("/administration")).toBe(false);
      expect(isParticulierRoute("/connexion")).toBe(false);
      expect(isParticulierRoute("/")).toBe(false);
      expect(isParticulierRoute("/mentions-legales")).toBe(false);
    });

    it("devrait gérer les cas edge", () => {
      expect(isParticulierRoute("")).toBe(false);
      expect(isParticulierRoute("/")).toBe(false);
      expect(isParticulierRoute("/mon-compt")).toBe(false);
    });
  });

  describe("isProtectedRoute", () => {
    it("devrait identifier les routes admin comme protégées", () => {
      expect(isProtectedRoute("/administration")).toBe(true);
      expect(isProtectedRoute("/administration/users")).toBe(true);
      expect(isProtectedRoute("/api/private")).toBe(true);
      expect(isProtectedRoute("/test")).toBe(true);
    });

    it("devrait identifier les routes particulier comme protégées", () => {
      expect(isProtectedRoute("/mon-compte")).toBe(true);
      expect(isProtectedRoute("/mes-dossiers")).toBe(true);
      expect(isProtectedRoute("/mes-demandes")).toBe(true);
    });

    it("devrait identifier les routes publiques comme non-protégées", () => {
      expect(isProtectedRoute("/")).toBe(false);
      expect(isProtectedRoute("/connexion")).toBe(false);
      expect(isProtectedRoute("/mentions-legales")).toBe(false);
      expect(isProtectedRoute("/cgu")).toBe(false);
      expect(isProtectedRoute("/politique-confidentialite")).toBe(false);
    });

    it("devrait gérer les cas edge", () => {
      expect(isProtectedRoute("")).toBe(false);
      expect(isProtectedRoute("/")).toBe(false);
      expect(isProtectedRoute("/unknown-route")).toBe(false);
    });
  });

  describe("canAccessRoute", () => {
    describe("Routes admin", () => {
      it("devrait autoriser l'accès ADMIN aux routes admin", () => {
        expect(canAccessRoute("/administration", ROLES.ADMIN)).toBe(true);
        expect(canAccessRoute("/administration/users", ROLES.ADMIN)).toBe(true);
        expect(canAccessRoute("/api/private", ROLES.ADMIN)).toBe(true);
        expect(canAccessRoute("/test", ROLES.ADMIN)).toBe(true);
      });

      it("devrait autoriser l'accès INSTRUCTEUR aux routes admin", () => {
        expect(canAccessRoute("/administration", ROLES.INSTRUCTEUR)).toBe(true);
        expect(canAccessRoute("/administration/users", ROLES.INSTRUCTEUR)).toBe(true);
        expect(canAccessRoute("/api/private", ROLES.INSTRUCTEUR)).toBe(true);
      });

      it("devrait autoriser l'accès AMO aux routes admin", () => {
        expect(canAccessRoute("/administration", ROLES.AMO)).toBe(true);
        expect(canAccessRoute("/administration/users", ROLES.AMO)).toBe(true);
        expect(canAccessRoute("/api/private", ROLES.AMO)).toBe(true);
      });

      it("devrait refuser l'accès PARTICULIER aux routes admin", () => {
        expect(canAccessRoute("/administration", ROLES.PARTICULIER)).toBe(false);
        expect(canAccessRoute("/administration/users", ROLES.PARTICULIER)).toBe(false);
        expect(canAccessRoute("/api/private", ROLES.PARTICULIER)).toBe(false);
        expect(canAccessRoute("/test", ROLES.PARTICULIER)).toBe(false);
      });

      it("devrait refuser l'accès sans rôle aux routes admin", () => {
        expect(canAccessRoute("/administration", undefined)).toBe(false);
        expect(canAccessRoute("/api/private", undefined)).toBe(false);
      });
    });

    describe("Routes particulier", () => {
      it("devrait autoriser l'accès PARTICULIER aux routes particulier", () => {
        expect(canAccessRoute("/mon-compte", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("/mes-dossiers", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("/mes-demandes", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("/mon-compte/profile", ROLES.PARTICULIER)).toBe(true);
      });

      it("devrait refuser l'accès ADMIN aux routes particulier", () => {
        expect(canAccessRoute("/mon-compte", ROLES.ADMIN)).toBe(false);
        expect(canAccessRoute("/mes-dossiers", ROLES.ADMIN)).toBe(false);
        expect(canAccessRoute("/mes-demandes", ROLES.ADMIN)).toBe(false);
      });

      it("devrait refuser l'accès INSTRUCTEUR aux routes particulier", () => {
        expect(canAccessRoute("/mon-compte", ROLES.INSTRUCTEUR)).toBe(false);
        expect(canAccessRoute("/mes-dossiers", ROLES.INSTRUCTEUR)).toBe(false);
      });

      it("devrait refuser l'accès AMO aux routes particulier", () => {
        expect(canAccessRoute("/mon-compte", ROLES.AMO)).toBe(false);
        expect(canAccessRoute("/mes-dossiers", ROLES.AMO)).toBe(false);
      });

      it("devrait refuser l'accès sans rôle aux routes particulier", () => {
        expect(canAccessRoute("/mon-compte", undefined)).toBe(false);
        expect(canAccessRoute("/mes-dossiers", undefined)).toBe(false);
      });
    });

    describe("Routes publiques", () => {
      it("devrait autoriser l'accès ADMIN aux routes publiques", () => {
        expect(canAccessRoute("/", ROLES.ADMIN)).toBe(true);
        expect(canAccessRoute("/connexion", ROLES.ADMIN)).toBe(true);
        expect(canAccessRoute("/mentions-legales", ROLES.ADMIN)).toBe(true);
        expect(canAccessRoute("/cgu", ROLES.ADMIN)).toBe(true);
      });

      it("devrait autoriser l'accès INSTRUCTEUR aux routes publiques", () => {
        expect(canAccessRoute("/", ROLES.INSTRUCTEUR)).toBe(true);
        expect(canAccessRoute("/connexion", ROLES.INSTRUCTEUR)).toBe(true);
      });

      it("devrait autoriser l'accès AMO aux routes publiques", () => {
        expect(canAccessRoute("/", ROLES.AMO)).toBe(true);
        expect(canAccessRoute("/connexion", ROLES.AMO)).toBe(true);
      });

      it("devrait autoriser l'accès PARTICULIER aux routes publiques", () => {
        expect(canAccessRoute("/", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("/connexion", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("/mentions-legales", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("/cgu", ROLES.PARTICULIER)).toBe(true);
      });

      it("devrait refuser l'accès sans rôle aux routes publiques", () => {
        expect(canAccessRoute("/", undefined)).toBe(false);
        expect(canAccessRoute("/connexion", undefined)).toBe(false);
        expect(canAccessRoute("/mentions-legales", undefined)).toBe(false);
      });
    });

    describe("Cas edge", () => {
      it("devrait gérer une route vide", () => {
        expect(canAccessRoute("", ROLES.ADMIN)).toBe(true);
        expect(canAccessRoute("", ROLES.INSTRUCTEUR)).toBe(true);
        expect(canAccessRoute("", ROLES.AMO)).toBe(true);
        expect(canAccessRoute("", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("", undefined)).toBe(false);
      });

      it("devrait gérer une route inconnue", () => {
        expect(canAccessRoute("/route-inconnue", ROLES.ADMIN)).toBe(true);
        expect(canAccessRoute("/route-inconnue", ROLES.INSTRUCTEUR)).toBe(true);
        expect(canAccessRoute("/route-inconnue", ROLES.AMO)).toBe(true);
        expect(canAccessRoute("/route-inconnue", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("/route-inconnue", undefined)).toBe(false);
      });

      it("devrait gérer un rôle invalide", () => {
        // @ts-expect-error - Test avec une valeur invalide intentionnellement
        expect(canAccessRoute("/administration", "invalid_role")).toBe(false);
        // @ts-expect-error - Test avec une valeur invalide intentionnellement
        expect(canAccessRoute("/mon-compte", "invalid_role")).toBe(false);
      });
    });
  });
});
