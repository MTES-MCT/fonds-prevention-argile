import { UserRole, type AgentRole } from "@/shared/domain/value-objects";

// Rôles qu'une structure peut conférer, dans les mêmes mots que les habilitations.
export function libelleRoleDeStructure(role: AgentRole): string {
  if (role === UserRole.AMO_ET_ALLERS_VERS) return "AMO et Aller-vers";
  if (role === UserRole.AMO) return "AMO";
  if (role === UserRole.ALLERS_VERS) return "Aller-vers";
  return role;
}
