import { UserRole } from "@/shared/domain/value-objects/user-role.enum";

// Les autres rôles ne sont responsables d'aucun dossier : leur liste par défaut est « Tous les dossiers ».
const ROLES_MES_DOSSIERS: readonly string[] = [UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS, UserRole.ALLERS_VERS];

export function travailleSurMesDossiers(role: string): boolean {
  return ROLES_MES_DOSSIERS.includes(role);
}
