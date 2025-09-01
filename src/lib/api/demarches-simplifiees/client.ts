import { getServerEnv } from "@/lib/config/env.config";
import type {
  DemarcheBase,
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
      env.DEMARCHES_SIMPLIFIEES_API_URL ||
      "https://www.demarches-simplifiees.fr/api/v2/graphql";
    this.apiKey = env.DEMARCHES_SIMPLIFIEES_API_KEY;

    if (!this.apiKey) {
      throw new Error("DEMARCHES_SIMPLIFIEES_API_KEY is not configured");
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
   * Récupère les informations de base d'une démarche
   */
  async getDemarcheBase(number: number): Promise<DemarcheBase | null> {
    const query = `
      query GetDemarcheBase($number: Int!) {
        demarche(number: $number) {
          id
          number
          title
          state
          dateCreation
          dateDerniereModification
          dateDepublication
          datePublication
        }
      }
    `;

    try {
      const data = await this.executeQuery<{ demarche: DemarcheBase }>(query, {
        number,
      });
      return data.demarche;
    } catch (error) {
      console.error(`Failed to fetch demarche ${number}:`, error);
      return null;
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
      ) {
        demarche(number: $number) {
          id
          title
          dossiers(
            first: $first
            after: $after
            state: $state
            archived: $archived
            order: $order
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
                civilite
                nom
                prenom
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
        first: filters?.first ?? 20,
        after: filters?.after,
        state: filters?.state,
        archived: filters?.archived,
        order: filters?.order,
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
            civilite
            nom
            prenom
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
            instructeur {
              id
              email
            }
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
  if (!clientInstance) {
    clientInstance = new DemarchesSimplifieesClient();
  }
  return clientInstance;
}
