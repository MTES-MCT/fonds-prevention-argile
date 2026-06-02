"use server";

import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { actionsService } from "../services/actions.service";
import type {
  ActionsListResult,
  ActionFormData,
  CreateActionResult,
  UpdateActionResult,
  DeleteActionResult,
} from "../domain/types/action.types";

/**
 * Récupère toutes les actions d'un parcours
 * Vérifie automatiquement les permissions de l'agent connecté
 */
export async function getActionsAction(parcoursId: string): Promise<ActionsListResult> {
  try {
    const agentResult = await getCurrentAgent();
    if (!agentResult.success || !agentResult.data) {
      return { actions: [], totalCount: 0 };
    }

    const agent = agentResult.data;

    const result = await actionsService.getActionsForParcours(
      parcoursId,
      agent.id,
      agent.role,
      agent.entrepriseAmoId,
      agent.allersVersId
    );

    return { ...result, currentAgentId: agent.id };
  } catch (error) {
    console.error("Erreur lors de la récupération des actions:", error);
    return { actions: [], totalCount: 0 };
  }
}

/**
 * Crée une nouvelle action sur un parcours
 */
export async function createActionAction(parcoursId: string, data: ActionFormData): Promise<CreateActionResult> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const agentResult = await getCurrentAgent();
    if (!agentResult.success || !agentResult.data) {
      return { success: false, error: "Vous devez être connecté pour créer une action." };
    }

    const agent = agentResult.data;

    return await actionsService.createAction(parcoursId, agent.id, agent.role, data);
  } catch (error) {
    console.error("Erreur lors de la création de l'action:", error);
    return { success: false, error: "Une erreur est survenue lors de la création de l'action." };
  }
}

/**
 * Met à jour le commentaire d'une action existante
 */
export async function updateActionAction(actionId: string, message: string): Promise<UpdateActionResult> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const agentResult = await getCurrentAgent();
    if (!agentResult.success || !agentResult.data) {
      return { success: false, error: "Vous devez être connecté pour modifier une action." };
    }

    const agent = agentResult.data;

    return await actionsService.updateAction(actionId, agent.id, agent.role, message);
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'action:", error);
    return { success: false, error: "Une erreur est survenue lors de la mise à jour de l'action." };
  }
}

/**
 * Supprime une action
 */
export async function deleteActionAction(actionId: string): Promise<DeleteActionResult> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const agentResult = await getCurrentAgent();
    if (!agentResult.success || !agentResult.data) {
      return { success: false, error: "Vous devez être connecté pour supprimer une action." };
    }

    const agent = agentResult.data;

    return await actionsService.deleteAction(actionId, agent.id, agent.role);
  } catch (error) {
    console.error("Erreur lors de la suppression de l'action:", error);
    return { success: false, error: "Une erreur est survenue lors de la suppression de l'action." };
  }
}
