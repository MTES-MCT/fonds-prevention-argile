import { parcoursRepo } from "@/shared/database";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import type {
  DossierItem,
  DossiersTerritoireFilters,
  DossiersTerritoireResult,
} from "../domain/types/dossiers-territoire.types";

/**
 * Listing unifié des dossiers visibles par un agent à partir de son scope
 * territorial (départements + EPCI, union). Inclut dossiers avec ou sans
 * validation AMO. Le responsable du dossier est calculé en aval.
 */
export async function getDossiersByAgent(
  agent: AgentScopeInput,
  filters?: DossiersTerritoireFilters
): Promise<DossiersTerritoireResult> {
  const scope = await calculateAgentScope(agent);

  const hasTerritorialScope = scope.isNational || scope.departements.length > 0 || scope.epcis.length > 0;
  if (!hasTerritorialScope && !scope.canViewDossiersByEntreprise) {
    return emptyResult([], []);
  }

  // Accès national : pas de filtre territorial (le repo retourne tout).
  const departements = scope.isNational ? [] : scope.departements;
  const epcis = scope.isNational ? [] : scope.epcis;

  const rows = await parcoursRepo.getParcoursByTerritoire(departements, epcis, filters);

  const dossiers: DossierItem[] = rows.map(toDossierItem);

  return {
    dossiers,
    total: dossiers.length,
    territoiresCouverts: { departements, epcis },
  };
}

function emptyResult(departements: string[], epcis: string[]): DossiersTerritoireResult {
  return {
    dossiers: [],
    total: 0,
    territoiresCouverts: { departements, epcis },
  };
}

type Row = Awaited<ReturnType<typeof parcoursRepo.getParcoursByTerritoire>>[number];

function toDossierItem(row: Row): DossierItem {
  const logement = getDemandeurFirstLogement(row);

  return {
    parcoursId: row.parcoursId,
    particulier: {
      prenom: row.userPrenom ?? "",
      nom: row.userNom ?? "",
      email: row.userEmail ?? "",
      telephone: row.userTelephone ?? null,
    },
    logement: {
      commune: logement?.commune_nom ?? logement?.commune ?? null,
      codeDepartement: logement?.code_departement ? String(logement.code_departement) : null,
      codeEpci: logement?.epci ? String(logement.epci) : null,
    },
    currentStep: row.currentStep,
    currentStatus: row.currentStatus,
    situationParticulier: row.situationParticulier,
    validation: row.validationId
      ? {
          statut: row.validationStatut!,
          entrepriseAmoId: row.entrepriseAmoId,
          choisieAt: row.validationChoisieAt!,
          valideeAt: row.validationValideeAt,
        }
      : null,
    dsStatus: row.dsStatus ?? null,
    createdByAgentId: row.createdByAgentId,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
