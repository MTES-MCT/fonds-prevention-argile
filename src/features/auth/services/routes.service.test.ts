import { describe, it, expect } from "vitest";
import { isAdminRoute, isParticulierRoute, isProtectedRoute, canAccessRoute } from "./routes.service";
import { ROLES } from "../domain/value-objects/constants";
import { ROUTES } from "../domain/value-objects/configs/routes.config";

describe("routes.service", () => {
  describe("isAdminRoute", () => {
    it("devrait identifier les routes administration", () => {
      expect(isAdminRoute(ROUTES.backoffice.administration.root)).toBe(true);
      expect(isAdminRoute(`${ROUTES.backoffice.administration.root}/users`)).toBe(true);
      expect(isAdminRoute(`${ROUTES.backoffice.administration.root}/settings/profile`)).toBe(true);
    });

    it("devrait identifier les routes espace-amo comme admin", () => {
      expect(isAdminRoute(ROUTES.backoffice.espaceAmo.root)).toBe(true);
      expect(isAdminRoute(ROUTES.backoffice.espaceAmo.notifications)).toBe(true);
      expect(isAdminRoute(ROUTES.backoffice.espaceAmo.dossiers)).toBe(true);
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
      expect(isAdminRoute(ROUTES.particulier.monCompte)).toBe(false);
      expect(isAdminRoute(ROUTES.connexion.particulier)).toBe(false);
      expect(isAdminRoute(ROUTES.home)).toBe(false);
      expect(isAdminRoute(ROUTES.mentionsLegales)).toBe(false);
    });

    it("devrait gérer les cas edge", () => {
      expect(isAdminRoute("")).toBe(false);
      expect(isAdminRoute("/")).toBe(false);
      expect(isAdminRoute("/admin")).toBe(false); // /admin n'existe pas, c'est /administration
    });
  });

  describe("isParticulierRoute", () => {
    it("devrait identifier les routes particulier", () => {
      expect(isParticulierRoute(ROUTES.particulier.monCompte)).toBe(true);
      expect(isParticulierRoute(`${ROUTES.particulier.monCompte}/profile`)).toBe(true);
      expect(isParticulierRoute(`${ROUTES.particulier.monCompte}/settings`)).toBe(true);
    });

    it("devrait identifier les routes mes-dossiers", () => {
      expect(isParticulierRoute(ROUTES.particulier.mesDossiers)).toBe(true);
      expect(isParticulierRoute(`${ROUTES.particulier.mesDossiers}/123`)).toBe(true);
    });

    it("devrait identifier les routes mes-demandes", () => {
      expect(isParticulierRoute(ROUTES.particulier.mesDemandes)).toBe(true);
      expect(isParticulierRoute(`${ROUTES.particulier.mesDemandes}/nouvelle`)).toBe(true);
    });

    it("devrait rejeter les routes non-particulier", () => {
      expect(isParticulierRoute(ROUTES.backoffice.administration.root)).toBe(false);
      expect(isParticulierRoute(ROUTES.connexion.particulier)).toBe(false);
      expect(isParticulierRoute(ROUTES.home)).toBe(false);
      expect(isParticulierRoute(ROUTES.mentionsLegales)).toBe(false);
    });

    it("devrait gérer les cas edge", () => {
      expect(isParticulierRoute("")).toBe(false);
      expect(isParticulierRoute("/")).toBe(false);
      expect(isParticulierRoute("/mon-compt")).toBe(false);
    });
  });

  describe("isProtectedRoute", () => {
    it("devrait identifier les routes backoffice comme protégées", () => {
      expect(isProtectedRoute(ROUTES.backoffice.administration.root)).toBe(true);
      expect(isProtectedRoute(`${ROUTES.backoffice.administration.root}/users`)).toBe(true);
      expect(isProtectedRoute(ROUTES.backoffice.espaceAmo.root)).toBe(true);
      expect(isProtectedRoute("/api/private")).toBe(true);
      expect(isProtectedRoute("/test")).toBe(true);
    });

    it("devrait identifier les routes particulier comme protégées", () => {
      expect(isProtectedRoute(ROUTES.particulier.monCompte)).toBe(true);
      expect(isProtectedRoute(ROUTES.particulier.mesDossiers)).toBe(true);
      expect(isProtectedRoute(ROUTES.particulier.mesDemandes)).toBe(true);
    });

    it("devrait identifier les routes publiques comme non-protégées", () => {
      expect(isProtectedRoute(ROUTES.home)).toBe(false);
      expect(isProtectedRoute(ROUTES.connexion.particulier)).toBe(false);
      expect(isProtectedRoute(ROUTES.mentionsLegales)).toBe(false);
      expect(isProtectedRoute(ROUTES.cgu)).toBe(false);
      expect(isProtectedRoute(ROUTES.politiqueConfidentialite)).toBe(false);
    });

    it("devrait gérer les cas edge", () => {
      expect(isProtectedRoute("")).toBe(false);
      expect(isProtectedRoute("/")).toBe(false);
      expect(isProtectedRoute("/unknown-route")).toBe(false);
    });
  });

  describe("canAccessRoute", () => {
    describe("Routes backoffice (agents)", () => {
      it("devrait autoriser l'accès ADMIN aux routes backoffice", () => {
        expect(canAccessRoute(ROUTES.backoffice.administration.root, ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute(`${ROUTES.backoffice.administration.root}/users`, ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute(ROUTES.backoffice.espaceAmo.root, ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute("/api/private", ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute("/test", ROLES.ADMINISTRATEUR)).toBe(true);
      });

      it("devrait autoriser l'accès SUPER_ADMINISTRATEUR aux routes backoffice", () => {
        expect(canAccessRoute(ROUTES.backoffice.administration.root, ROLES.SUPER_ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute("/api/private", ROLES.SUPER_ADMINISTRATEUR)).toBe(true);
      });

      it("devrait autoriser l'accès AMO aux routes backoffice", () => {
        expect(canAccessRoute(ROUTES.backoffice.administration.root, ROLES.AMO)).toBe(true);
        expect(canAccessRoute(ROUTES.backoffice.espaceAmo.root, ROLES.AMO)).toBe(true);
        expect(canAccessRoute("/api/private", ROLES.AMO)).toBe(true);
      });

      it("devrait refuser l'accès PARTICULIER aux routes backoffice", () => {
        expect(canAccessRoute(ROUTES.backoffice.administration.root, ROLES.PARTICULIER)).toBe(false);
        expect(canAccessRoute(ROUTES.backoffice.espaceAmo.root, ROLES.PARTICULIER)).toBe(false);
        expect(canAccessRoute("/api/private", ROLES.PARTICULIER)).toBe(false);
        expect(canAccessRoute("/test", ROLES.PARTICULIER)).toBe(false);
      });

      it("devrait refuser l'accès sans rôle aux routes backoffice", () => {
        expect(canAccessRoute(ROUTES.backoffice.administration.root, undefined)).toBe(false);
        expect(canAccessRoute("/api/private", undefined)).toBe(false);
      });
    });

    describe("Routes particulier", () => {
      it("devrait autoriser l'accès PARTICULIER aux routes particulier", () => {
        expect(canAccessRoute(ROUTES.particulier.monCompte, ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute(ROUTES.particulier.mesDossiers, ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute(ROUTES.particulier.mesDemandes, ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute(`${ROUTES.particulier.monCompte}/profile`, ROLES.PARTICULIER)).toBe(true);
      });

      it("devrait refuser l'accès ADMIN aux routes particulier", () => {
        expect(canAccessRoute(ROUTES.particulier.monCompte, ROLES.ADMINISTRATEUR)).toBe(false);
        expect(canAccessRoute(ROUTES.particulier.mesDossiers, ROLES.ADMINISTRATEUR)).toBe(false);
        expect(canAccessRoute(ROUTES.particulier.mesDemandes, ROLES.ADMINISTRATEUR)).toBe(false);
      });

      it("devrait refuser l'accès SUPER_ADMINISTRATEUR aux routes particulier", () => {
        expect(canAccessRoute(ROUTES.particulier.monCompte, ROLES.SUPER_ADMINISTRATEUR)).toBe(false);
        expect(canAccessRoute(ROUTES.particulier.mesDossiers, ROLES.SUPER_ADMINISTRATEUR)).toBe(false);
      });

      it("devrait refuser l'accès AMO aux routes particulier", () => {
        expect(canAccessRoute(ROUTES.particulier.monCompte, ROLES.AMO)).toBe(false);
        expect(canAccessRoute(ROUTES.particulier.mesDossiers, ROLES.AMO)).toBe(false);
      });

      it("devrait refuser l'accès sans rôle aux routes particulier", () => {
        expect(canAccessRoute(ROUTES.particulier.monCompte, undefined)).toBe(false);
        expect(canAccessRoute(ROUTES.particulier.mesDossiers, undefined)).toBe(false);
      });
    });

    describe("Routes publiques", () => {
      it("devrait autoriser l'accès ADMIN aux routes publiques", () => {
        expect(canAccessRoute(ROUTES.home, ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute(ROUTES.connexion.particulier, ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute(ROUTES.mentionsLegales, ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute(ROUTES.cgu, ROLES.ADMINISTRATEUR)).toBe(true);
      });

      it("devrait autoriser l'accès SUPER_ADMINISTRATEUR aux routes publiques", () => {
        expect(canAccessRoute(ROUTES.home, ROLES.SUPER_ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute(ROUTES.connexion.particulier, ROLES.SUPER_ADMINISTRATEUR)).toBe(true);
      });

      it("devrait autoriser l'accès AMO aux routes publiques", () => {
        expect(canAccessRoute(ROUTES.home, ROLES.AMO)).toBe(true);
        expect(canAccessRoute(ROUTES.connexion.particulier, ROLES.AMO)).toBe(true);
      });

      it("devrait autoriser l'accès PARTICULIER aux routes publiques", () => {
        expect(canAccessRoute(ROUTES.home, ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute(ROUTES.connexion.particulier, ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute(ROUTES.mentionsLegales, ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute(ROUTES.cgu, ROLES.PARTICULIER)).toBe(true);
      });

      it("devrait refuser l'accès sans rôle aux routes publiques", () => {
        expect(canAccessRoute(ROUTES.home, undefined)).toBe(false);
        expect(canAccessRoute(ROUTES.connexion.particulier, undefined)).toBe(false);
        expect(canAccessRoute(ROUTES.mentionsLegales, undefined)).toBe(false);
      });
    });

    describe("Cas edge", () => {
      it("devrait gérer une route vide", () => {
        expect(canAccessRoute("", ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute("", ROLES.SUPER_ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute("", ROLES.AMO)).toBe(true);
        expect(canAccessRoute("", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("", undefined)).toBe(false);
      });

      it("devrait gérer une route inconnue", () => {
        expect(canAccessRoute("/route-inconnue", ROLES.ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute("/route-inconnue", ROLES.SUPER_ADMINISTRATEUR)).toBe(true);
        expect(canAccessRoute("/route-inconnue", ROLES.AMO)).toBe(true);
        expect(canAccessRoute("/route-inconnue", ROLES.PARTICULIER)).toBe(true);
        expect(canAccessRoute("/route-inconnue", undefined)).toBe(false);
      });

      it("devrait gérer un rôle invalide", () => {
        // @ts-expect-error - Test avec une valeur invalide intentionnellement
        expect(canAccessRoute(ROUTES.backoffice.administration.root, "invalid_role")).toBe(false);
        // @ts-expect-error - Test avec une valeur invalide intentionnellement
        expect(canAccessRoute(ROUTES.particulier.monCompte, "invalid_role")).toBe(false);
      });
    });
  });
});
