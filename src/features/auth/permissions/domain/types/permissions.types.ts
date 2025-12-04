import type { AuthUser } from "@/features/auth/domain/entities";
import type { UserRole } from "@/shared/domain/value-objects";
import { AccessErrorCode } from "../value-objects";

/**
 * Résultat d'une vérification d'accès
 */
export interface AccessCheckResult {
  /** L'utilisateur a-t-il accès ? */
  hasAccess: boolean;
  /** Utilisateur authentifié (si hasAccess = true) */
  user?: AuthUser;
  /** Raison du refus (si hasAccess = false) */
  reason?: string;
  /** Code d'erreur (si hasAccess = false) */
  errorCode?: AccessErrorCode;
}

/**
 * Options pour la vérification d'accès
 */
export interface AccessCheckOptions {
  /** Rôles requis (au moins un doit correspondre) */
  requiredRoles?: UserRole[];
  /** Méthode d'authentification requise */
  requiredAuthMethod?: string;
  /** Vérifier les permissions spécifiques (future) */
  requiredPermissions?: string[];
}
