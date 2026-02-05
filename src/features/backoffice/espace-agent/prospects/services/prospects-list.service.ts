import { parcoursRepo } from "@/shared/database";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import { daysSince } from "@/shared/utils/date-diff";
import { db, entreprisesAmo } from "@/shared/database";
import { like, or } from "drizzle-orm";
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
        hasAmoDisponible: true,
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
      const logement = r.rgaSimulationData?.logement;

      return {
        parcoursId: r.parcoursId,
        particulier: {
          prenom: r.userPrenom || "",
          nom: r.userNom || "",
          email: r.userEmail || "",
          telephone: r.userTelephone || null,
        },
        logement: {
          adresse: logement?.adresse || "Adresse non renseignée",
          commune: logement?.commune_nom || logement?.commune || "Commune non renseignée",
          codePostal: logement?.commune || "",
          codeDepartement: logement?.code_departement || "",
          codeEpci: logement?.epci || undefined,
        },
        currentStep: r.currentStep,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        daysSinceLastAction: daysSince(r.updatedAt),
      };
    });

    // Vérifier si au moins un AMO couvre les départements de l'agent
    const hasAmoDisponible = await this.checkAmoDisponibleDansDepartements(scope.departements);

    return {
      prospects,
      totalCount: prospects.length,
      territoriesCovered: {
        departements: scope.departements,
        epcis: scope.epcis,
      },
      hasAmoDisponible,
    };
  }

  /**
   * Vérifie si au moins un AMO couvre l'un des départements donnés
   */
  private async checkAmoDisponibleDansDepartements(departements: string[]): Promise<boolean> {
    if (departements.length === 0) return false;

    // Construire les conditions LIKE pour chaque département
    const conditions = departements.map((dept) => like(entreprisesAmo.departements, `%${dept}%`));

    const result = await db
      .select({ id: entreprisesAmo.id })
      .from(entreprisesAmo)
      .where(conditions.length === 1 ? conditions[0] : or(...conditions))
      .limit(1);

    return result.length > 0;
  }
}

// Instance singleton
export const prospectsListService = new ProspectsListService();
