// Export GraphQL
export * as GraphQL from "./graphql";

// Export REST
export * as REST from "./rest";

// Exports directs pour compatibilité
export { getDemarchesSimplifieesClient as graphqlClient } from "./graphql/client";
export { prefillClient as restClient } from "./rest";
