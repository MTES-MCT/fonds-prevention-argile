import { parcoursRepo } from "@/shared/database";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import { daysSince } from "@/shared/utils/date-diff";
import type {
  Prospect,
  ProspectsListResult,
  ProspectFilters,
} from "../domain/types";

/**
 * Service pour récupérer la liste des prospects d'un agent Allers-Vers
 */
export class ProspectsListService {
  /**
   * Récupère la liste des prospects pour un agent Allers-Vers
   *
   * @param agentInput - Informations de l'agent
   * @param filters - Filtres optionnels
   * @returns Liste des prospects du territoire
   */
  async getProspectsForAgent(
    agentInput: AgentScopeInput,
    filters?: ProspectFilters
  ): Promise<ProspectsListResult> {
    // Calculer le scope de l'agent
    const scope = await calculateAgentScope(agentInput);

    // Vérifier que l'agent peut voir les dossiers sans AMO
    if (!scope.canViewDossiersWithoutAmo) {
      return {
        prospects: [],
        totalCount: 0,
        territoriesCovered: {
          departements: [],
          epcis: [],
        },
      };
    }

    // Récupérer les parcours sans AMO du territoire
    const results = await parcoursRepo.getParcoursWithoutAmoByTerritoire(
      scope.departements,
      scope.epcis,
      {
        commune: filters?.commune,
        step: filters?.step,
        maxDaysSinceAction: filters?.maxDaysSinceAction,
        search: filters?.search,
      }
    );

    // Transformer en Prospects
    const prospects: Prospect[] = results.map((r) => {
      // Extraire les données de logement depuis rgaSimulationData
      const rgaData = r.rgaSimulationData as any;
      const logement = rgaData?.logement || {};

      return {
        parcoursId: r.parcoursId,
        particulier: {
          prenom: r.userPrenom,
          nom: r.userNom,
          email: r.userEmail,
        },
        logement: {
          adresse: logement.adresse || "Adresse non renseignée",
          commune: logement.commune || "Commune non renseignée",
          codePostal: logement.codePostal || "",
          codeDepartement: logement.departement || "",
          codeEpci: logement.epci || undefined,
        },
        currentStep: r.currentStep,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        daysSinceLastAction: daysSince(r.updatedAt),
      };
    });

    return {
      prospects,
      totalCount: prospects.length,
      territoriesCovered: {
        departements: scope.departements,
        epcis: scope.epcis,
      },
    };
  }
}

// Instance singleton
export const prospectsListService = new ProspectsListService();
