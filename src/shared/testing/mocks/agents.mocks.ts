import { AgentWithPermissions } from "@/features/backoffice";

/**
 * Crée un agent de test avec permissions
 */
export const createMockAgentWithPermissions = (override?: Partial<AgentWithPermissions>): AgentWithPermissions => ({
  agent: {
    id: "agent-123",
    sub: "proconnect-sub-123",
    email: "agent@example.com",
    givenName: "Agent",
    usualName: "Test",
    uid: "uid-123",
    siret: null,
    phone: null,
    organizationalUnit: null,
    role: "administrateur",
    createdAt: new Date("2024-01-01T10:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
    ...override?.agent,
  },
  departements: override?.departements ?? [],
});

/**
 * Crée plusieurs agents avec des rôles différents
 */
export const createMockAgentsWithPermissions = (roles: string[]): AgentWithPermissions[] => {
  return roles.map((role, index) =>
    createMockAgentWithPermissions({
      agent: {
        id: `agent-${index + 1}`,
        sub: `proconnect-sub-${index + 1}`,
        email: `agent${index + 1}@example.com`,
        givenName: `Agent${index + 1}`,
        usualName: `Test${index + 1}`,
        uid: `uid-${index + 1}`,
        siret: null,
        phone: null,
        organizationalUnit: null,
        role,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-15T10:00:00Z"),
      },
    })
  );
};
