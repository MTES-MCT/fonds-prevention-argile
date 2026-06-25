import { UserRole } from "@/shared/domain/value-objects";

/**
 * Rôles habilités à ré-ouvrir une demande refusée par l'AMO (cf. ADR-0016).
 * Sert au gate d'affichage du bouton (page) ET à la garde de la server action.
 * Le périmètre fin (entreprise AMO / territoire AV) est vérifié en plus côté action
 * via `canReopenRefusedDemande`.
 */
export const ROLES_REOUVERTURE: string[] = [
  UserRole.SUPER_ADMINISTRATEUR,
  UserRole.AMO,
  UserRole.ALLERS_VERS,
  UserRole.AMO_ET_ALLERS_VERS,
];
