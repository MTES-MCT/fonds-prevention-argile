import { UserRole } from "@/shared/domain/value-objects";

/**
 * Capacités d'accès aux deux espaces du backoffice, pour piloter la navigation
 * unifiée (ADR-0015). Logique pure : la vraie barrière reste les gardes de
 * layout / page / Server Actions.
 */

/**
 * Accès à l'espace /administration (rangée « Pilotage »).
 * Ouvert aux agents AMO / Allers-Vers depuis l'ouverture des stats nationales
 * (ADR-0017) : ils n'y voient que les onglets stats (Tableau de bord, Acquisition,
 * Demandeurs). Les onglets sensibles restent masqués (`minRoles`) et gardés au
 * niveau page (`isAdminRole` / `isSuperAdminRole`).
 */
export function canAccessAdministration(role: string): boolean {
  return (
    role === UserRole.SUPER_ADMINISTRATEUR ||
    role === UserRole.ADMINISTRATEUR ||
    role === UserRole.ANALYSTE ||
    role === UserRole.AMO ||
    role === UserRole.ALLERS_VERS ||
    role === UserRole.AMO_ET_ALLERS_VERS
  );
}

/**
 * Accès à l'espace agent (rangée « Suivi des dossiers »).
 * L'ANALYSTE n'y accède que s'il est départemental (au moins un département),
 * aligné sur la garde du layout espace-agent ; l'analyste national en est exclu.
 */
export function canAccessEspaceAgent(role: string, analysteHasDepartements: boolean): boolean {
  if (
    role === UserRole.SUPER_ADMINISTRATEUR ||
    role === UserRole.AMO ||
    role === UserRole.ALLERS_VERS ||
    role === UserRole.AMO_ET_ALLERS_VERS
  ) {
    return true;
  }
  if (role === UserRole.ANALYSTE) {
    return analysteHasDepartements;
  }
  return false;
}
