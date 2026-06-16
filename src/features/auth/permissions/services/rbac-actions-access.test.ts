import { describe, it, expect } from "vitest";
import { hasPermission } from "./rbac.service";
import { BackofficePermission } from "../domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

/**
 * Garantit la matrice d'accès aux actions (anciennement commentaires) :
 * tous les agents terrain peuvent créer et lire les actions ; l'administrateur
 * reste en lecture seule ; les analystes n'ont aucun accès.
 */
describe("RBAC — accès aux actions", () => {
  // Agents terrain : peuvent saisir des actions sur tous les dossiers
  const ROLES_TERRAIN = [UserRole.AMO, UserRole.ALLERS_VERS, UserRole.AMO_ET_ALLERS_VERS];

  describe("agents terrain", () => {
    it.each(ROLES_TERRAIN)("%s peut créer une action (COMMENTAIRES_CREATE)", (role) => {
      expect(hasPermission(role, BackofficePermission.COMMENTAIRES_CREATE)).toBe(true);
    });

    it.each(ROLES_TERRAIN)("%s peut lire les actions (COMMENTAIRES_READ)", (role) => {
      expect(hasPermission(role, BackofficePermission.COMMENTAIRES_READ)).toBe(true);
    });

    it.each(ROLES_TERRAIN)("%s peut modifier/supprimer ses propres actions", (role) => {
      expect(hasPermission(role, BackofficePermission.COMMENTAIRES_UPDATE_OWN)).toBe(true);
      expect(hasPermission(role, BackofficePermission.COMMENTAIRES_DELETE_OWN)).toBe(true);
    });
  });

  describe("super administrateur", () => {
    it("peut créer et lire les actions (accès total)", () => {
      expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, BackofficePermission.COMMENTAIRES_CREATE)).toBe(true);
      expect(hasPermission(UserRole.SUPER_ADMINISTRATEUR, BackofficePermission.COMMENTAIRES_READ)).toBe(true);
    });
  });

  describe("administrateur (lecture seule)", () => {
    it("peut lire toutes les actions (COMMENTAIRES_READ_ALL) mais pas en créer", () => {
      expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.COMMENTAIRES_READ_ALL)).toBe(true);
      expect(hasPermission(UserRole.ADMINISTRATEUR, BackofficePermission.COMMENTAIRES_CREATE)).toBe(false);
    });
  });

  describe("analystes (aucun accès aux actions)", () => {
    it.each([UserRole.ANALYSTE])("%s ne peut ni créer ni lire d'action", (role) => {
      expect(hasPermission(role, BackofficePermission.COMMENTAIRES_CREATE)).toBe(false);
      expect(hasPermission(role, BackofficePermission.COMMENTAIRES_READ)).toBe(false);
      expect(hasPermission(role, BackofficePermission.COMMENTAIRES_READ_ALL)).toBe(false);
    });
  });
});
