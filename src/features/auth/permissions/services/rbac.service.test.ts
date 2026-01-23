import { describe, it, expect } from "vitest";
import { hasPermission, hasAllPermissions, hasAnyPermission, getRolePermissions, canAccessTab } from "./rbac.service";
import { BackofficePermission } from "../domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

describe("rbac.service", () => {
  describe("hasPermission", () => {
    describe("SUPER_ADMINISTRATEUR", () => {
      it("devrait avoir toutes les permissions", () => {
        // Tester un échantillon de permissions variées
        expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, BackofficePermission.STATS_READ)).toBe(true);
        expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, BackofficePermission.AMO_WRITE)).toBe(true);
        expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, BackofficePermission.AGENTS_DELETE)).toBe(true);
        expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, BackofficePermission.ELIGIBILITE_WRITE)).toBe(true);
        expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, BackofficePermission.DOSSIERS_AMO_READ)).toBe(true);
        expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, BackofficePermission.DOSSIERS_AMO_STATS_READ)).toBe(true);
      });

      it("devrait avoir accès à toutes les permissions définies", () => {
        const allPermissions = Object.values(BackofficePermission);
        allPermissions.forEach((permission) => {
          expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, permission)).toBe(true);
        });
      });
    });

    describe("ADMINISTRATEUR", () => {
      it("devrait avoir accès aux statistiques", () => {
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.STATS_READ)).toBe(true);
      });

      it("devrait avoir accès complet aux users", () => {
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.USERS_READ)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.USERS_STATS_READ)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.USERS_DETAIL_READ)).toBe(true);
      });

      it("devrait avoir accès en lecture/écriture aux AMO", () => {
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.AMO_READ)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.AMO_WRITE)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.AMO_DELETE)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.AMO_IMPORT)).toBe(true);
      });

      it("devrait avoir accès en lecture/écriture aux Allers Vers", () => {
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.ALLERS_VERS_READ)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.ALLERS_VERS_WRITE)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.ALLERS_VERS_DELETE)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.ALLERS_VERS_IMPORT)).toBe(true);
      });

      it("ne devrait PAS avoir accès aux agents", () => {
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.AGENTS_READ)).toBe(false);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.AGENTS_WRITE)).toBe(false);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.AGENTS_DELETE)).toBe(false);
      });

      it("devrait avoir accès aux dossiers (éligibilité, diagnostic, devis, factures)", () => {
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.ELIGIBILITE_READ)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.ELIGIBILITE_WRITE)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.DIAGNOSTIC_READ)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.DEVIS_READ)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.FACTURES_READ)).toBe(true);
      });

      it("devrait avoir accès aux dossiers AMO", () => {
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.DOSSIERS_AMO_READ)).toBe(true);
        expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.DOSSIERS_AMO_STATS_READ)).toBe(true);
      });
    });

    describe("ANALYSTE", () => {
      it("devrait avoir accès en lecture aux statistiques", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.STATS_READ)).toBe(true);
      });

      it("devrait avoir accès uniquement aux stats des users", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.USERS_STATS_READ)).toBe(true);
      });

      it("ne devrait PAS avoir accès à la liste détaillée des users", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.USERS_READ)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.USERS_DETAIL_READ)).toBe(false);
      });

      it("devrait avoir accès en lecture seule aux AMO", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.AMO_READ)).toBe(true);
      });

      it("ne devrait PAS avoir accès en écriture aux AMO", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.AMO_WRITE)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.AMO_DELETE)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.AMO_IMPORT)).toBe(false);
      });

      it("devrait avoir accès en lecture seule aux Allers Vers", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.ALLERS_VERS_READ)).toBe(true);
      });

      it("ne devrait PAS avoir accès en écriture aux Allers Vers", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.ALLERS_VERS_WRITE)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.ALLERS_VERS_DELETE)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.ALLERS_VERS_IMPORT)).toBe(false);
      });

      it("ne devrait PAS avoir accès aux agents", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.AGENTS_READ)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.AGENTS_WRITE)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.AGENTS_DELETE)).toBe(false);
      });

      it("ne devrait PAS avoir accès aux dossiers", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.ELIGIBILITE_READ)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.ELIGIBILITE_WRITE)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.DIAGNOSTIC_READ)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.DEVIS_READ)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.FACTURES_READ)).toBe(false);
      });

      it("ne devrait PAS avoir accès aux dossiers AMO", () => {
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.DOSSIERS_AMO_READ)).toBe(false);
        expect(hasPermission(UserRole.ANALYSTE, BackofficePermission.DOSSIERS_AMO_STATS_READ)).toBe(false);
      });
    });

    describe("AMO", () => {
      it("devrait avoir accès uniquement aux dossiers de son entreprise AMO", () => {
        expect(hasPermission(UserRole.AMO, BackofficePermission.DOSSIERS_AMO_READ)).toBe(true);
        expect(hasPermission(UserRole.AMO, BackofficePermission.DOSSIERS_AMO_STATS_READ)).toBe(true);
      });

      it("ne devrait PAS avoir accès aux statistiques globales", () => {
        expect(hasPermission(UserRole.AMO, BackofficePermission.STATS_READ)).toBe(false);
      });

      it("ne devrait PAS avoir accès aux users", () => {
        expect(hasPermission(UserRole.AMO, BackofficePermission.USERS_READ)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.USERS_STATS_READ)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.USERS_DETAIL_READ)).toBe(false);
      });

      it("ne devrait PAS avoir accès à la gestion des AMO", () => {
        expect(hasPermission(UserRole.AMO, BackofficePermission.AMO_READ)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.AMO_WRITE)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.AMO_DELETE)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.AMO_IMPORT)).toBe(false);
      });

      it("ne devrait PAS avoir accès aux Allers Vers", () => {
        expect(hasPermission(UserRole.AMO, BackofficePermission.ALLERS_VERS_READ)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.ALLERS_VERS_WRITE)).toBe(false);
      });

      it("ne devrait PAS avoir accès aux agents", () => {
        expect(hasPermission(UserRole.AMO, BackofficePermission.AGENTS_READ)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.AGENTS_WRITE)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.AGENTS_DELETE)).toBe(false);
      });

      it("ne devrait PAS avoir accès aux autres dossiers", () => {
        expect(hasPermission(UserRole.AMO, BackofficePermission.ELIGIBILITE_READ)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.DIAGNOSTIC_READ)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.DEVIS_READ)).toBe(false);
        expect(hasPermission(UserRole.AMO, BackofficePermission.FACTURES_READ)).toBe(false);
      });
    });

    describe("PARTICULIER", () => {
      it("ne devrait avoir aucune permission backoffice", () => {
        expect(hasPermission(UserRole.PARTICULIER, BackofficePermission.STATS_READ)).toBe(false);
        expect(hasPermission(UserRole.PARTICULIER, BackofficePermission.USERS_READ)).toBe(false);
        expect(hasPermission(UserRole.PARTICULIER, BackofficePermission.AMO_READ)).toBe(false);
        expect(hasPermission(UserRole.PARTICULIER, BackofficePermission.DOSSIERS_AMO_READ)).toBe(false);
      });
    });
  });

  describe("hasAllPermissions", () => {
    it("devrait retourner true si le rôle a TOUTES les permissions requises", () => {
      const requiredPermissions = [BackofficePermission.STATS_READ, BackofficePermission.USERS_STATS_READ];

      expect(hasAllPermissions(UserRole.SUPER_ADMINISTRATEUR, requiredPermissions)).toBe(true);
      expect(hasAllPermissions(UserRole.ADMINISTRATEUR, requiredPermissions)).toBe(true);
      expect(hasAllPermissions(UserRole.ANALYSTE, requiredPermissions)).toBe(true);
    });

    it("devrait retourner false si le rôle manque UNE des permissions requises", () => {
      const requiredPermissions = [BackofficePermission.AMO_READ, BackofficePermission.AMO_WRITE];

      expect(hasAllPermissions(UserRole.ADMINISTRATEUR, requiredPermissions)).toBe(true);
      expect(hasAllPermissions(UserRole.ANALYSTE, requiredPermissions)).toBe(false); // Manque AMO_WRITE
    });

    it("devrait retourner true pour un tableau vide de permissions", () => {
      expect(hasAllPermissions(UserRole.ANALYSTE, [])).toBe(true);
    });

    it("devrait gérer des permissions multiples pour SUPER_ADMIN", () => {
      const requiredPermissions = [
        BackofficePermission.AGENTS_READ,
        BackofficePermission.AGENTS_WRITE,
        BackofficePermission.AGENTS_DELETE,
      ];

      expect(hasAllPermissions(UserRole.SUPER_ADMINISTRATEUR, requiredPermissions)).toBe(true);
      expect(hasAllPermissions(UserRole.ADMINISTRATEUR, requiredPermissions)).toBe(false);
    });

    it("devrait vérifier les permissions AMO", () => {
      const amoPermissions = [BackofficePermission.DOSSIERS_AMO_READ, BackofficePermission.DOSSIERS_AMO_STATS_READ];

      expect(hasAllPermissions(UserRole.AMO, amoPermissions)).toBe(true);
      expect(hasAllPermissions(UserRole.ANALYSTE, amoPermissions)).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    it("devrait retourner true si le rôle a AU MOINS UNE des permissions requises", () => {
      const requiredPermissions = [BackofficePermission.AMO_WRITE, BackofficePermission.AMO_READ];

      expect(hasAnyPermission(UserRole.ANALYSTE, requiredPermissions)).toBe(true); // A AMO_READ
    });

    it("devrait retourner false si le rôle n'a AUCUNE des permissions requises", () => {
      const requiredPermissions = [BackofficePermission.AGENTS_READ, BackofficePermission.AGENTS_WRITE];

      expect(hasAnyPermission(UserRole.ANALYSTE, requiredPermissions)).toBe(false);
    });

    it("devrait retourner false pour un tableau vide de permissions", () => {
      expect(hasAnyPermission(UserRole.ANALYSTE, [])).toBe(false);
    });

    it("devrait retourner true pour SUPER_ADMIN avec n'importe quelle permission", () => {
      const requiredPermissions = [BackofficePermission.ELIGIBILITE_READ];

      expect(hasAnyPermission(UserRole.SUPER_ADMINISTRATEUR, requiredPermissions)).toBe(true);
    });

    it("devrait fonctionner pour les permissions AMO", () => {
      const requiredPermissions = [BackofficePermission.DOSSIERS_AMO_READ, BackofficePermission.STATS_READ];

      expect(hasAnyPermission(UserRole.AMO, requiredPermissions)).toBe(true); // A DOSSIERS_AMO_READ
      expect(hasAnyPermission(UserRole.ANALYSTE, requiredPermissions)).toBe(true); // A STATS_READ
    });
  });

  describe("getRolePermissions", () => {
    it("devrait retourner toutes les permissions pour SUPER_ADMINISTRATEUR", () => {
      const permissions = getRolePermissions(UserRole.SUPER_ADMINISTRATEUR);

      // Vérifier que toutes les permissions existent
      expect(permissions.length).toBeGreaterThan(15); // On sait qu'il y a plus de 15 permissions
      expect(permissions).toContain(BackofficePermission.STATS_READ);
      expect(permissions).toContain(BackofficePermission.AGENTS_DELETE);
      expect(permissions).toContain(BackofficePermission.DOSSIERS_AMO_READ);
      expect(permissions).toContain(BackofficePermission.DOSSIERS_AMO_STATS_READ);
    });

    it("devrait retourner les bonnes permissions pour ADMINISTRATEUR", () => {
      const permissions = getRolePermissions(UserRole.ADMINISTRATEUR);

      // Doit contenir
      expect(permissions).toContain(BackofficePermission.STATS_READ);
      expect(permissions).toContain(BackofficePermission.AMO_WRITE);
      expect(permissions).toContain(BackofficePermission.USERS_READ);
      expect(permissions).toContain(BackofficePermission.USERS_DETAIL_READ);
      expect(permissions).toContain(BackofficePermission.DOSSIERS_AMO_READ);
      expect(permissions).toContain(BackofficePermission.DOSSIERS_AMO_STATS_READ);

      // Ne doit PAS contenir
      expect(permissions).not.toContain(BackofficePermission.AGENTS_READ);
      expect(permissions).not.toContain(BackofficePermission.AGENTS_WRITE);
      expect(permissions).not.toContain(BackofficePermission.AGENTS_DELETE);
    });

    it("devrait retourner uniquement les permissions de lecture pour ANALYSTE", () => {
      const permissions = getRolePermissions(UserRole.ANALYSTE);

      // Doit contenir (seulement 4 permissions)
      expect(permissions.length).toBe(4);
      expect(permissions).toContain(BackofficePermission.STATS_READ);
      expect(permissions).toContain(BackofficePermission.USERS_STATS_READ);
      expect(permissions).toContain(BackofficePermission.AMO_READ);
      expect(permissions).toContain(BackofficePermission.ALLERS_VERS_READ);

      // Ne doit PAS contenir
      expect(permissions).not.toContain(BackofficePermission.USERS_READ);
      expect(permissions).not.toContain(BackofficePermission.USERS_DETAIL_READ);
      expect(permissions).not.toContain(BackofficePermission.AMO_WRITE);
      expect(permissions).not.toContain(BackofficePermission.ALLERS_VERS_WRITE);
      expect(permissions).not.toContain(BackofficePermission.AGENTS_READ);
      expect(permissions).not.toContain(BackofficePermission.DOSSIERS_AMO_READ);
    });

    it("devrait retourner les permissions dossiers AMO pour le rôle AMO", () => {
      const permissions = getRolePermissions(UserRole.AMO);

      expect(permissions.length).toBe(2);
      expect(permissions).toContain(BackofficePermission.DOSSIERS_AMO_READ);
      expect(permissions).toContain(BackofficePermission.DOSSIERS_AMO_STATS_READ);
    });

    it("devrait retourner un tableau vide pour un rôle inconnu", () => {
      const permissions = getRolePermissions("ROLE_INCONNU" as UserRole);
      expect(permissions).toEqual([]);
    });
  });

  describe("canAccessTab", () => {
    describe("Onglet statistiques", () => {
      it("devrait être accessible par SUPER_ADMIN, ADMIN et ANALYSTE", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "statistiques")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "statistiques")).toBe(true);
        expect(canAccessTab(UserRole.ANALYSTE, "statistiques")).toBe(true);
      });

      it("ne devrait PAS être accessible par AMO et PARTICULIER", () => {
        expect(canAccessTab(UserRole.AMO, "statistiques")).toBe(false);
        expect(canAccessTab(UserRole.PARTICULIER, "statistiques")).toBe(false);
      });
    });

    describe("Onglet users", () => {
      it("devrait être accessible par SUPER_ADMIN, ADMIN et ANALYSTE", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "users")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "users")).toBe(true);
        expect(canAccessTab(UserRole.ANALYSTE, "users")).toBe(true);
      });

      it("ne devrait PAS être accessible par AMO", () => {
        expect(canAccessTab(UserRole.AMO, "users")).toBe(false);
      });
    });

    describe("Onglet amo", () => {
      it("devrait être accessible par SUPER_ADMIN, ADMIN et ANALYSTE", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "amo")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "amo")).toBe(true);
        expect(canAccessTab(UserRole.ANALYSTE, "amo")).toBe(true);
      });

      it("ne devrait PAS être accessible par AMO", () => {
        expect(canAccessTab(UserRole.AMO, "amo")).toBe(false);
      });
    });

    describe("Onglet allers-vers", () => {
      it("devrait être accessible par SUPER_ADMIN, ADMIN et ANALYSTE", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "allers-vers")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "allers-vers")).toBe(true);
        expect(canAccessTab(UserRole.ANALYSTE, "allers-vers")).toBe(true);
      });

      it("ne devrait PAS être accessible par AMO", () => {
        expect(canAccessTab(UserRole.AMO, "allers-vers")).toBe(false);
      });
    });

    describe("Onglet agents", () => {
      it("devrait être accessible par SUPER_ADMIN uniquement", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "agents")).toBe(true);
      });

      it("ne devrait PAS être accessible par ADMIN", () => {
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "agents")).toBe(false);
      });

      it("ne devrait PAS être accessible par ANALYSTE", () => {
        expect(canAccessTab(UserRole.ANALYSTE, "agents")).toBe(false);
      });

      it("ne devrait PAS être accessible par AMO", () => {
        expect(canAccessTab(UserRole.AMO, "agents")).toBe(false);
      });
    });

    describe("Onglet dossiers-amo", () => {
      it("devrait être accessible par SUPER_ADMIN, ADMIN et AMO", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "dossiers-amo")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "dossiers-amo")).toBe(true);
        expect(canAccessTab(UserRole.AMO, "dossiers-amo")).toBe(true);
      });

      it("ne devrait PAS être accessible par ANALYSTE", () => {
        expect(canAccessTab(UserRole.ANALYSTE, "dossiers-amo")).toBe(false);
      });

      it("ne devrait PAS être accessible par PARTICULIER", () => {
        expect(canAccessTab(UserRole.PARTICULIER, "dossiers-amo")).toBe(false);
      });
    });

    describe("Onglet eligibilite", () => {
      it("devrait être accessible par SUPER_ADMIN et ADMIN", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "eligibilite")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "eligibilite")).toBe(true);
      });

      it("ne devrait PAS être accessible par ANALYSTE", () => {
        expect(canAccessTab(UserRole.ANALYSTE, "eligibilite")).toBe(false);
      });
    });

    describe("Onglet diagnostic", () => {
      it("devrait être accessible par SUPER_ADMIN et ADMIN", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "diagnostic")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "diagnostic")).toBe(true);
      });

      it("ne devrait PAS être accessible par ANALYSTE", () => {
        expect(canAccessTab(UserRole.ANALYSTE, "diagnostic")).toBe(false);
      });
    });

    describe("Onglet devis", () => {
      it("devrait être accessible par SUPER_ADMIN et ADMIN", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "devis")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "devis")).toBe(true);
      });

      it("ne devrait PAS être accessible par ANALYSTE", () => {
        expect(canAccessTab(UserRole.ANALYSTE, "devis")).toBe(false);
      });
    });

    describe("Onglet factures", () => {
      it("devrait être accessible par SUPER_ADMIN et ADMIN", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "factures")).toBe(true);
        expect(canAccessTab(UserRole.ADMINISTRATEUR, "factures")).toBe(true);
      });

      it("ne devrait PAS être accessible par ANALYSTE", () => {
        expect(canAccessTab(UserRole.ANALYSTE, "factures")).toBe(false);
      });
    });

    describe("Onglet inexistant", () => {
      it("devrait être accessible par défaut si aucune permission n'est définie", () => {
        expect(canAccessTab(UserRole.SUPER_ADMINISTRATEUR, "onglet-inexistant")).toBe(true);
        expect(canAccessTab(UserRole.ANALYSTE, "onglet-inexistant")).toBe(true);
      });
    });
  });

  describe("Cas limites et sécurité", () => {
    it("devrait gérer les rôles null/undefined de manière sécurisée", () => {
      expect(hasPermission(null as unknown as UserRole, BackofficePermission.STATS_READ)).toBe(false);
      expect(hasPermission(undefined as unknown as UserRole, BackofficePermission.STATS_READ)).toBe(false);
    });

    it("devrait gérer les permissions null/undefined de manière sécurisée", () => {
      expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, null as unknown as BackofficePermission)).toBe(false);
      expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, undefined as unknown as BackofficePermission)).toBe(false);
    });
  });
});
