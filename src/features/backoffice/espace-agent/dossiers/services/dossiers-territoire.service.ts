import { parcoursActionsRepo, parcoursRepo } from "@/shared/database";
import { toSuiviChorus } from "@/features/parcours/dossiers-ds/domain/value-objects/suivi-chorus";
import { ACTION_LABELS_BY_VALUE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { perimetreListing } from "@/features/auth/permissions/domain/perimetre-listing";
import {
  canActAsResponsable,
  getActorContext,
} from "@/features/auth/permissions/services/responsable-permissions.service";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
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

  // canViewAllDossiers et non isNational : un analyste national voit les stats nationales, aucun dossier.
  const perimetre = perimetreListing(scope);
  if (perimetre.kind === "aucun") {
    return emptyResult([], []);
  }

  const rows = await parcoursRepo.getParcoursByTerritoire(perimetre, filters);
  const bareItems = rows.map(toDossierItemSansResponsable);

  const [resolved, actor, actionsMap] = await Promise.all([
    resolveResponsables(rows.map(entreeResolveur)),
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
    territoiresCouverts:
      perimetre.kind === "territoire"
        ? { departements: perimetre.departements, epcis: perimetre.epcis }
        : { departements: [], epcis: [] },
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

export type LigneListing = Awaited<ReturnType<typeof parcoursRepo.getParcoursByTerritoire>>[number];
type Row = LigneListing;

function entreeResolveur(row: Row): ResolverDossier {
  const logement = getDemandeurFirstLogement(row);
  return {
    parcoursId: row.parcoursId,
    archivedAt: row.archivedAt,
    currentStatus: row.currentStatus,
    codeDepartement: logement?.code_departement ? toOfficialCodeDepartement(logement.code_departement) : null,
    codeEpci: logement?.epci ? String(logement.epci) : null,
    validation: row.validationId ? { statut: row.validationStatut!, entrepriseAmoId: row.entrepriseAmoId } : null,
    dsStatus: row.dsStatus ?? null,
    instructedAt: row.instructedAt ?? null,
  };
}

/** Lignes de l'onglet « Mes dossiers » : celles dont l'agent est responsable, même calcul que le listing. */
export async function filtrerMesDossiers<R extends Row>(
  agent: Pick<AgentScopeInput, "entrepriseAmoId" | "allersVersId">,
  rows: R[]
): Promise<R[]> {
  if (rows.length === 0) return [];
  const [resolved, actor] = await Promise.all([
    resolveResponsables(rows.map(entreeResolveur)),
    getActorContext({ entrepriseAmoId: agent.entrepriseAmoId ?? null, allersVersId: agent.allersVersId ?? null }),
  ]);
  return rows.filter((row) => canActAsResponsable(actor, resolved.get(row.parcoursId)!.responsable));
}
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
      codeDepartement: logement?.code_departement ? toOfficialCodeDepartement(logement.code_departement) : null,
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
    dossierCreatedAt: row.dossierCreatedAt ?? null,
    submittedAt: row.submittedAt ?? null,
    instructedAt: row.instructedAt ?? null,
    suiviChorus: toSuiviChorus({
      chorusTiersFournisseur: row.chorusTiersFournisseur ?? null,
      chorusTiersFournisseurAt: row.chorusTiersFournisseurAt ?? null,
      chorusNumeroEj: row.chorusNumeroEj ?? null,
      chorusNumeroEjAt: row.chorusNumeroEjAt ?? null,
      chorusMontantSubvention: row.chorusMontantSubvention ?? null,
      chorusMontantSubventionAt: row.chorusMontantSubventionAt ?? null,
    }),
    createdByAgentId: row.createdByAgentId,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
