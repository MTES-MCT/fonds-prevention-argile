/**
 * Rôles disponibles pour les agents ProConnect
 */
export const AgentRole = {
  ADMIN: "ADMIN",
  INSTRUCTEUR: "INSTRUCTEUR",
  AMO: "AMO",
} as const;

export type AgentRole = (typeof AgentRole)[keyof typeof AgentRole];

/**
 * Vérifie si une valeur est un rôle agent valide
 */
export function isValidAgentRole(role: string): role is AgentRole {
  return Object.values(AgentRole).includes(role as AgentRole);
}
