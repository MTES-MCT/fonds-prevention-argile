import { parcoursActionsRepo, parcoursRepo } from "@/shared/database";
import { ACTION_LABELS_BY_VALUE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import {
  canActAsResponsable,
  getActorContext,
} from "@/features/auth/permissions/services/responsable-permissions.service";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import { getEpciBySiren } from "@/features/seo/services/territoires.service";
import { resolveResponsables, type ResolverDossier } from "./responsable-resolver.service";
import type {
  DossierItem,
  DossiersTerritoireFilters,
  DossiersTerritoireResult,
  EpciChoice,
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

  // « Voir tous les dossiers » = accès national aux dossiers (admins via
  // canViewAllDossiers), distinct de isNational qui ne vaut que pour les stats
  // (un analyste national voit les stats nationales mais aucun dossier ici).
  const hasTerritorialScope = scope.canViewAllDossiers || scope.departements.length > 0 || scope.epcis.length > 0;
  if (!hasTerritorialScope && !scope.canViewDossiersByEntreprise) {
    return emptyResult([], []);
  }

  // Accès national aux dossiers : pas de filtre territorial (le repo retourne tout).
  const departements = scope.canViewAllDossiers ? [] : scope.departements;
  const epcis = scope.canViewAllDossiers ? [] : scope.epcis;

  const rows = await parcoursRepo.getParcoursByTerritoire(departements, epcis, filters);
  const bareItems = rows.map(toDossierItemSansResponsable);

  const resolverInput: ResolverDossier[] = bareItems.map((item) => ({
    parcoursId: item.parcoursId,
    archivedAt: item.archivedAt,
    currentStatus: item.currentStatus,
    codeDepartement: item.logement.codeDepartement,
    codeEpci: item.logement.codeEpci,
    validation: item.validation
      ? { statut: item.validation.statut, entrepriseAmoId: item.validation.entrepriseAmoId }
      : null,
    dsStatus: item.dsStatus,
    instructedAt: item.instructedAt,
  }));
  const [resolved, actor, actionsMap] = await Promise.all([
    resolveResponsables(resolverInput),
    getActorContext({ entrepriseAmoId: agent.entrepriseAmoId ?? null, allersVersId: agent.allersVersId ?? null }),
    parcoursActionsRepo.getLastActionByParcoursIds(bareItems.map((i) => i.parcoursId)),
  ]);

  const dossiers: DossierItem[] = bareItems.map((item) => {
    const { responsable, etat } = resolved.get(item.parcoursId)!;
    const lastAction = actionsMap.get(item.parcoursId);
    return {
      ...item,
      responsable,
      etat,
      canActAsResponsable: canActAsResponsable(actor, responsable),
      derniereAction: lastAction
        ? {
            actionType: lastAction.actionType,
            label: ACTION_LABELS_BY_VALUE[lastAction.actionType] ?? lastAction.actionType,
            message: lastAction.message,
            date: lastAction.createdAt,
          }
        : null,
    };
  });

  return {
    dossiers,
    total: dossiers.length,
    territoiresCouverts: { departements, epcis },
    epcisDisponibles: buildEpciChoices(dossiers),
  };
}

function emptyResult(departements: string[], epcis: string[]): DossiersTerritoireResult {
  return {
    dossiers: [],
    total: 0,
    territoiresCouverts: { departements, epcis },
    epcisDisponibles: [],
  };
}

/**
 * Construit la liste {code, nom} des EPCI distincts présents dans les dossiers,
 * triée par nom pour le rendu du filtre. Le nom vient du référentiel SEO.
 */
function buildEpciChoices(dossiers: DossierItem[]): EpciChoice[] {
  const codes = new Set<string>();
  for (const d of dossiers) {
    if (d.logement.codeEpci) codes.add(d.logement.codeEpci);
  }
  return Array.from(codes)
    .map((code) => ({ code, nom: getEpciBySiren(code)?.nom ?? code }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

type Row = Awaited<ReturnType<typeof parcoursRepo.getParcoursByTerritoire>>[number];
type DossierItemSansResponsable = Omit<DossierItem, "responsable" | "etat" | "canActAsResponsable" | "derniereAction">;

function toDossierItemSansResponsable(row: Row): DossierItemSansResponsable {
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
          id: row.validationId,
          statut: row.validationStatut!,
          entrepriseAmoId: row.entrepriseAmoId,
          choisieAt: row.validationChoisieAt!,
          valideeAt: row.validationValideeAt,
        }
      : null,
    dsStatus: row.dsStatus ?? null,
    instructedAt: row.instructedAt ?? null,
    createdByAgentId: row.createdByAgentId,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
