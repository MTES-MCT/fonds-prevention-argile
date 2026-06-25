import { parcoursActionsRepo, agentsRepo } from "@/shared/database/repositories";
import { buildAuthorSnapshot } from "./author-snapshot";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import type { UserRole } from "@/shared/domain/value-objects";
import {
  ACTION_TYPE_VALUES,
  ACTION_TYPE_COMMENTAIRE_LIBRE,
  ACTION_TYPE_AUTRE,
  type ActionsListResult,
  type ActionFormData,
  type CreateActionResult,
  type UpdateActionResult,
  type DeleteActionResult,
} from "../domain/types/action.types";

/**
 * Service métier pour la gestion des actions réalisées sur les parcours
 * Gère les permissions et la logique métier
 */
export class ActionsService {
  /**
   * Récupère toutes les actions d'un parcours
   * Vérifie que l'agent a accès au parcours avant de retourner les actions
   */
  async getActionsForParcours(
    parcoursId: string,
    agentId: string,
    role: UserRole,
    entrepriseAmoId?: string | null,
    allersVersId?: string | null
  ): Promise<ActionsListResult> {
    const canRead =
      hasPermission(role, BackofficePermission.COMMENTAIRES_READ) ||
      hasPermission(role, BackofficePermission.COMMENTAIRES_READ_ALL);

    if (!canRead) {
      return { actions: [], totalCount: 0 };
    }

    // Pour les admins : accès total (COMMENTAIRES_READ_ALL)
    if (hasPermission(role, BackofficePermission.COMMENTAIRES_READ_ALL)) {
      const actions = await parcoursActionsRepo.findByParcoursId(parcoursId);
      return { actions, totalCount: actions.length };
    }

    // Vérifier que le parcours est dans le scope territorial de l'agent
    const territoryError = await verifyProspectTerritoryAccess(parcoursId, {
      id: agentId,
      role,
      entrepriseAmoId: entrepriseAmoId ?? null,
      allersVersId: allersVersId ?? null,
    });
    if (territoryError) {
      return { actions: [], totalCount: 0 };
    }

    const actions = await parcoursActionsRepo.findByParcoursId(parcoursId);

    return { actions, totalCount: actions.length };
  }

  /**
   * Crée une nouvelle action sur un parcours
   */
  async createAction(
    parcoursId: string,
    agentId: string,
    role: UserRole,
    data: ActionFormData
  ): Promise<CreateActionResult> {
    if (!hasPermission(role, BackofficePermission.COMMENTAIRES_CREATE)) {
      return {
        success: false,
        error: "Permission refusée : vous ne pouvez pas créer d'action.",
      };
    }

    const { actionType } = data;
    const message = data.message?.trim() ?? "";
    const actionPrecision = data.actionPrecision?.trim() ?? "";

    // Validation du type d'action
    if (!actionType || !ACTION_TYPE_VALUES.includes(actionType)) {
      return { success: false, error: "Type d'action invalide." };
    }

    // Le commentaire libre exige un message
    if (actionType === ACTION_TYPE_COMMENTAIRE_LIBRE && message.length === 0) {
      return { success: false, error: "Le commentaire ne peut pas être vide." };
    }

    // "Autre" exige une précision
    if (actionType === ACTION_TYPE_AUTRE && actionPrecision.length === 0) {
      return { success: false, error: "Veuillez préciser l'action réalisée." };
    }

    if (message.length > 5000) {
      return { success: false, error: "Le commentaire ne peut pas dépasser 5000 caractères." };
    }

    try {
      const agent = await agentsRepo.findById(agentId);
      if (!agent) {
        return { success: false, error: "Agent introuvable." };
      }

      const { authorName, authorStructure, authorStructureType } = await buildAuthorSnapshot(agent);

      const created = await parcoursActionsRepo.create({
        parcoursId,
        agentId,
        actionType,
        actionPrecision: actionPrecision.length > 0 ? actionPrecision : null,
        message: message.length > 0 ? message : null,
        authorName,
        authorStructure,
        authorStructureType,
      });

      const actionDetail = await parcoursActionsRepo.findByIdWithDetails(created.id);

      if (!actionDetail) {
        return { success: false, error: "Erreur lors de la création de l'action." };
      }

      return { success: true, action: actionDetail };
    } catch (error) {
      console.error("Erreur lors de la création de l'action:", error);
      return { success: false, error: "Une erreur est survenue lors de la création de l'action." };
    }
  }

  /**
   * Met à jour le commentaire d'une action existante
   * Seul l'auteur de l'action peut le modifier
   */
  async updateAction(actionId: string, agentId: string, role: UserRole, message: string): Promise<UpdateActionResult> {
    if (!hasPermission(role, BackofficePermission.COMMENTAIRES_UPDATE_OWN)) {
      return {
        success: false,
        error: "Permission refusée : vous ne pouvez pas modifier cette action.",
      };
    }

    const actionExists = await parcoursActionsRepo.exists(actionId);
    if (!actionExists) {
      return { success: false, error: "Cette action n'existe pas ou a déjà été supprimée." };
    }

    const canEdit = await parcoursActionsRepo.canEditAction(actionId, agentId);
    if (!canEdit) {
      return { success: false, error: "Vous ne pouvez modifier que vos propres actions." };
    }

    if (!message || message.trim().length === 0) {
      return { success: false, error: "Le commentaire ne peut pas être vide." };
    }

    if (message.length > 5000) {
      return { success: false, error: "Le commentaire ne peut pas dépasser 5000 caractères." };
    }

    try {
      await parcoursActionsRepo.updateMessage(actionId, message.trim());

      const actionDetail = await parcoursActionsRepo.findByIdWithDetails(actionId);

      if (!actionDetail) {
        return { success: false, error: "Erreur lors de la mise à jour de l'action." };
      }

      return { success: true, action: actionDetail };
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'action:", error);
      return { success: false, error: "Une erreur est survenue lors de la mise à jour de l'action." };
    }
  }

  /**
   * Supprime une action
   * Seul l'auteur de l'action peut la supprimer
   */
  async deleteAction(actionId: string, agentId: string, role: UserRole): Promise<DeleteActionResult> {
    if (!hasPermission(role, BackofficePermission.COMMENTAIRES_DELETE_OWN)) {
      return {
        success: false,
        error: "Permission refusée : vous ne pouvez pas supprimer cette action.",
      };
    }

    const actionExists = await parcoursActionsRepo.exists(actionId);
    if (!actionExists) {
      return { success: false, error: "Cette action n'existe pas ou a déjà été supprimée." };
    }

    const canDelete = await parcoursActionsRepo.canEditAction(actionId, agentId);
    if (!canDelete) {
      return { success: false, error: "Vous ne pouvez supprimer que vos propres actions." };
    }

    try {
      const deleted = await parcoursActionsRepo.delete(actionId);

      if (!deleted) {
        return { success: false, error: "L'action n'a pas pu être supprimée." };
      }

      return { success: true };
    } catch (error) {
      console.error("Erreur lors de la suppression de l'action:", error);
      return { success: false, error: "Une erreur est survenue lors de la suppression de l'action." };
    }
  }
}

// Export d'une instance singleton
export const actionsService = new ActionsService();
