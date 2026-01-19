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
    entrepriseAmoId: null,
    createdAt: new Date("2024-01-01T10:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
    ...override?.agent,
  },
  departements: override?.departements ?? [],
  entrepriseAmo: override?.entrepriseAmo ?? null,
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
        entrepriseAmoId: null,
        createdAt: new Date("2024-01-01T10:00:00Z"),
        updatedAt: new Date("2024-01-15T10:00:00Z"),
      },
      entrepriseAmo: null,
    })
  );
};

/**
 * Crée un agent AMO de test avec son entreprise
 */
export const createMockAmoAgent = (override?: Partial<AgentWithPermissions>): AgentWithPermissions => ({
  agent: {
    id: "agent-amo-123",
    sub: "proconnect-sub-amo-123",
    email: "amo@example.com",
    givenName: "Agent",
    usualName: "AMO",
    uid: "uid-amo-123",
    siret: null,
    phone: null,
    organizationalUnit: null,
    role: "amo",
    entrepriseAmoId: "entreprise-amo-123",
    createdAt: new Date("2024-01-01T10:00:00Z"),
    updatedAt: new Date("2024-01-15T10:00:00Z"),
    ...override?.agent,
  },
  departements: [],
  entrepriseAmo: override?.entrepriseAmo ?? {
    id: "entreprise-amo-123",
    nom: "AMO Test SARL",
    siret: "12345678901234",
  },
});
