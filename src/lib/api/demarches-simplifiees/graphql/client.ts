import { getServerEnv } from "@/lib/config/env.config";
import type {
  DemarcheDetailed,
  Dossier,
  DossiersConnection,
  GraphQLResponse,
  QueryVariables,
  DossiersFilters,
} from "./types";

export class DemarchesSimplifieesClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    const env = getServerEnv();
    this.apiUrl =
      env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL ||
      "https://www.demarches-simplifiees.fr/api/v2/graphql";
    this.apiKey = env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY;

    if (!this.apiKey) {
      throw new Error(
        "DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY is not configured"
      );
    }
  }

  /**
   * Exécute une requête GraphQL
   */
  private async executeQuery<T = unknown>(
    query: string,
    variables?: QueryVariables
  ): Promise<T> {
    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          variables,
        }),
        // Cache pendant 5 minutes par défaut
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: GraphQLResponse<T> = await response.json();

      if (result.errors?.length) {
        const errorMessages = result.errors.map((e) => e.message).join(", ");
        console.error("GraphQL errors:", result.errors);
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      if (!result.data) {
        throw new Error("No data returned from API");
      }

      return result.data;
    } catch (error) {
      console.error("Error querying Démarches Simplifiées API:", error);
      throw error;
    }
  }

  /**
   * Récupère les informations détaillées d'une démarche
   */
  async getDemarcheDetailed(number: number): Promise<DemarcheDetailed | null> {
    const query = `
    query GetDemarcheDetailed($number: Int!) {
      demarche(number: $number) {
        id
        number
        title
        state
        dateCreation
        dateDerniereModification
        dateDepublication
        datePublication
        description
        service {
          id
          nom
          organisme
          typeOrganisme
        }
      }
    }
  `;

    try {
      const data = await this.executeQuery<{ demarche: DemarcheDetailed }>(
        query,
        { number }
      );
      return data.demarche;
    } catch (error) {
      console.error(`Failed to fetch detailed demarche ${number}:`, error);
      return null;
    }
  }

  /**
   * Récupère les dossiers d'une démarche avec pagination
   * Gère les démarches en test en récupérant TOUS les dossiers
   */
  async getDemarcheDossiers(
    number: number,
    filters?: DossiersFilters
  ): Promise<DossiersConnection | null> {
    const query = `
      query GetDemarcheDossiers(
        $number: Int!
        $first: Int
        $after: String
        $state: DossierState
        $archived: Boolean
        $order: Order
        $createdSince: ISO8601DateTime
        $updatedSince: ISO8601DateTime
      ) {
        demarche(number: $number) {
          id
          title
          state
          dossiers(
            first: $first
            after: $after
            state: $state
            archived: $archived
            order: $order
            createdSince: $createdSince
            updatedSince: $updatedSince
          ) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            nodes {
              id
              number
              state
              archived
              datePassageEnConstruction
              datePassageEnInstruction
              dateTraitement
              motivation
              usager {
                email
              }
              champs {
                id
                label
                stringValue
              }
            }
          }
        }
      }
    `;

    try {
      const variables = {
        number,
        first: filters?.first ?? 100,
        after: filters?.after,
        state: filters?.state,
        archived: filters?.archived,
        order: filters?.order,
        createdSince: filters?.createdSince,
        updatedSince: filters?.updatedSince,
      };

      const data = await this.executeQuery<{
        demarche: { dossiers: DossiersConnection };
      }>(query, variables);

      return data.demarche?.dossiers || null;
    } catch (error) {
      console.error(`Failed to fetch dossiers for demarche ${number}:`, error);
      return null;
    }
  }

  /**
   * Récupère le schéma d'une démarche avec les descripteurs de champs
   * Fonctionne même pour les démarches en test
   */
  async getDemarcheSchema(number: number): Promise<DemarcheDetailed | null> {
    const query = `
    query GetDemarcheSchema($number: Int!) {
      demarche(number: $number) {
        id
        number
        title
        state
        description
        dateCreation
        datePublication
        dateDerniereModification
        activeRevision {
          id
          datePublication
          champDescriptors {
            __typename
            id
            label
            description
            required
            ... on DropDownListChampDescriptor {
              options
            }
            ... on MultipleDropDownListChampDescriptor {
              options
            }
            ... on RepetitionChampDescriptor {
              champDescriptors {
                __typename
                id
                label
                description
                required
              }
            }
          }
        }
      }
    }
  `;

    try {
      const data = await this.executeQuery<{ demarche: DemarcheDetailed }>(
        query,
        { number }
      );
      return data.demarche;
    } catch (error) {
      console.error(`Failed to fetch schema for demarche ${number}:`, error);
      return null;
    }
  }

  /**
   * Récupère un dossier spécifique
   */
  /**
   * Récupère un dossier spécifique
   */
  async getDossier(dossierNumber: number): Promise<Dossier | null> {
    const query = `
      query GetDossier($number: Int!) {
        dossier(number: $number) {
          id
          number
          state
          archived
          datePassageEnConstruction
          datePassageEnInstruction
          dateTraitement
          dateDerniereCorrectionEnAttente
          motivation
          usager {
            email
          }
          instructeurs {
            id
            email
          }
          champs {
            id
            label
            stringValue
          }
          annotations {
            id
            label
            stringValue
          }
          messages {
            id
            email
            body
            createdAt
          }
        }
      }
    `;

    try {
      const data = await this.executeQuery<{ dossier: Dossier }>(query, {
        number: dossierNumber,
      });
      return data.dossier;
    } catch (error) {
      console.error(`Failed to fetch dossier ${dossierNumber}:`, error);
      return null;
    }
  }

  /**
   * Méthode générique pour exécuter des requêtes GraphQL personnalisées
   */
  async customQuery<T = unknown>(
    query: string,
    variables?: QueryVariables
  ): Promise<T> {
    return this.executeQuery<T>(query, variables);
  }
}

// Export d'une instance singleton
let clientInstance: DemarchesSimplifieesClient | null = null;

export function getDemarchesSimplifieesClient(): DemarchesSimplifieesClient {
  // Utiliser le mock si NEXT_PUBLIC_USE_DS_MOCK=true
  if (process.env.NEXT_PUBLIC_USE_DS_MOCK === "true") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { mockClient } = require("./client.mock");
    return mockClient;
  }

  if (!clientInstance) {
    clientInstance = new DemarchesSimplifieesClient();
  }
  return clientInstance;
}
