import { vi } from "vitest";
import { AuthUser } from "@/features/auth";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import type { JWTPayload } from "@/features/auth/domain/entities/jwtPayload";

/**
 * Crée un utilisateur de test avec un rôle spécifique
 */
export const createMockAuthUser = (role: UserRole, override?: Partial<AuthUser>): AuthUser => ({
  id: "user-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  role,
  authMethod: "proconnect",
  loginTime: new Date().toISOString(),
  ...override,
});

/**
 * Crée plusieurs utilisateurs de test avec des IDs différents
 */
export const createMockAuthUsers = (roles: UserRole[]): AuthUser[] => {
  return roles.map((role, index) => ({
    id: `user-${index + 1}`,
    email: `test${index + 1}@example.com`,
    firstName: `Test${index + 1}`,
    lastName: `User${index + 1}`,
    role,
    authMethod: "proconnect",
    loginTime: new Date().toISOString(),
  }));
};

/**
 * Crée un payload JWT de test
 */
export const createMockJWTPayload = (role: UserRole, override?: Partial<JWTPayload>): JWTPayload => {
  const now = Math.floor(Date.now() / 1000);
  return {
    userId: "user-123",
    role,
    firstName: "Test",
    lastName: "User",
    authMethod: "proconnect",
    exp: now + 3600, // Expire dans 1 heure
    iat: now,
    ...override,
  };
};

/**
 * Crée une session de test (format getSession)
 * Session = { userId, role } (version simplifiée sans les détails complets)
 */
export const createMockSession = (role: UserRole, override?: Partial<{ userId: string; role: UserRole }>) => ({
  userId: "user-123",
  role,
  ...override,
});

/**
 * Crée un utilisateur super admin
 */
export const createMockSuperAdmin = (override?: Partial<AuthUser>): AuthUser =>
  createMockAuthUser(UserRole.SUPER_ADMINISTRATEUR, {
    email: "superadmin@example.com",
    firstName: "Super",
    lastName: "Admin",
    ...override,
  });

/**
 * Crée un utilisateur administrateur
 */
export const createMockAdmin = (override?: Partial<AuthUser>): AuthUser =>
  createMockAuthUser(UserRole.ADMINISTRATEUR, {
    email: "admin@example.com",
    firstName: "Admin",
    lastName: "User",
    ...override,
  });

/**
 * Crée un utilisateur analyste
 */
export const createMockAnalyste = (override?: Partial<AuthUser>): AuthUser =>
  createMockAuthUser(UserRole.ANALYSTE, {
    email: "analyste@example.com",
    firstName: "Analyste",
    lastName: "User",
    ...override,
  });

/**
 * Crée un agent AMO
 */
export const createMockAgentAmo = (override?: Partial<AuthUser>): AuthUser =>
  createMockAuthUser(UserRole.AMO, {
    email: "amo@example.com",
    firstName: "AMO",
    lastName: "Agent",
    ...override,
  });

/**
 * Crée un utilisateur particulier
 */
export const createMockParticulier = (override?: Partial<AuthUser>): AuthUser =>
  createMockAuthUser(UserRole.PARTICULIER, {
    email: "particulier@example.com",
    firstName: "Jean",
    lastName: "Dupont",
    authMethod: "franceconnect",
    ...override,
  });
