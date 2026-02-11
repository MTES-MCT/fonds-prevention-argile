import { parcoursCommentairesRepo } from "@/shared/database/repositories";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import type { UserRole } from "@/shared/domain/value-objects";
import type {
  CommentairesListResult,
  CreateCommentaireResult,
  UpdateCommentaireResult,
  DeleteCommentaireResult,
} from "../domain/types/commentaire.types";

/**
 * Service métier pour la gestion des commentaires internes sur les parcours
 * Gère les permissions et la logique métier
 */
export class CommentairesService {
  /**
   * Récupère tous les commentaires d'un parcours
   * Vérifie que l'agent a accès au parcours avant de retourner les commentaires
   *
   * @param parcoursId - ID du parcours
   * @param agentId - ID de l'agent demandeur
   * @param role - Rôle de l'agent
   * @param entrepriseAmoId - ID de l'entreprise AMO (si applicable)
   * @param allersVersId - ID de la structure Allers-Vers (si applicable)
   */
  async getCommentairesForParcours(
    parcoursId: string,
    agentId: string,
    role: UserRole,
    entrepriseAmoId?: string | null,
    allersVersId?: string | null
  ): Promise<CommentairesListResult> {
    // Vérifier la permission de lecture
    const canRead =
      hasPermission(role, BackofficePermission.COMMENTAIRES_READ) ||
      hasPermission(role, BackofficePermission.COMMENTAIRES_READ_ALL);

    if (!canRead) {
      return {
        commentaires: [],
        totalCount: 0,
      };
    }

    // Pour les admins : accès total (COMMENTAIRES_READ_ALL)
    if (hasPermission(role, BackofficePermission.COMMENTAIRES_READ_ALL)) {
      const commentaires = await parcoursCommentairesRepo.findByParcoursId(parcoursId);
      return {
        commentaires,
        totalCount: commentaires.length,
      };
    }

    // Pour les agents AMO / Allers-Vers : vérifier l'accès au parcours via le scope
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _scope = await calculateAgentScope({
      id: agentId,
      role,
      entrepriseAmoId: entrepriseAmoId ?? null,
      allersVersId: allersVersId ?? null,
    });

    // TODO: Vérifier que le parcours est dans le scope de l'agent
    // Pour l'instant, on autorise l'accès (sera implémenté avec la logique de scope complète)
    const commentaires = await parcoursCommentairesRepo.findByParcoursId(parcoursId);

    return {
      commentaires,
      totalCount: commentaires.length,
    };
  }

  /**
   * Crée un nouveau commentaire sur un parcours
   *
   * @param parcoursId - ID du parcours
   * @param agentId - ID de l'agent créant le commentaire
   * @param role - Rôle de l'agent
   * @param message - Contenu du commentaire
   */
  async createCommentaire(
    parcoursId: string,
    agentId: string,
    role: UserRole,
    message: string
  ): Promise<CreateCommentaireResult> {
    // Vérifier la permission de création
    if (!hasPermission(role, BackofficePermission.COMMENTAIRES_CREATE)) {
      return {
        success: false,
        error: "Permission refusée : vous ne pouvez pas créer de commentaire.",
      };
    }

    // Validation du message
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: "Le message ne peut pas être vide.",
      };
    }

    if (message.length > 5000) {
      return {
        success: false,
        error: "Le message ne peut pas dépasser 5000 caractères.",
      };
    }

    try {
      // Créer le commentaire
      const commentaire = await parcoursCommentairesRepo.create({
        parcoursId,
        agentId,
        message: message.trim(),
      });

      // Récupérer les détails complets avec les infos de l'agent
      const commentaireDetail = await parcoursCommentairesRepo.findByIdWithDetails(commentaire.id);

      if (!commentaireDetail) {
        return {
          success: false,
          error: "Erreur lors de la création du commentaire.",
        };
      }

      return {
        success: true,
        commentaire: commentaireDetail,
      };
    } catch (error) {
      console.error("Erreur lors de la création du commentaire:", error);
      return {
        success: false,
        error: "Une erreur est survenue lors de la création du commentaire.",
      };
    }
  }

  /**
   * Met à jour un commentaire existant
   * Seul l'auteur du commentaire peut le modifier
   *
   * @param commentaireId - ID du commentaire à modifier
   * @param agentId - ID de l'agent demandant la modification
   * @param role - Rôle de l'agent
   * @param message - Nouveau message
   */
  async updateCommentaire(
    commentaireId: string,
    agentId: string,
    role: UserRole,
    message: string
  ): Promise<UpdateCommentaireResult> {
    // Vérifier la permission de modification
    if (!hasPermission(role, BackofficePermission.COMMENTAIRES_UPDATE_OWN)) {
      return {
        success: false,
        error: "Permission refusée : vous ne pouvez pas modifier ce commentaire.",
      };
    }

    // Vérifier que le commentaire existe
    const commentaireExists = await parcoursCommentairesRepo.exists(commentaireId);
    if (!commentaireExists) {
      return {
        success: false,
        error: "Ce commentaire n'existe pas ou a déjà été supprimé.",
      };
    }

    // Vérifier que l'agent est l'auteur du commentaire
    const canEdit = await parcoursCommentairesRepo.canEditComment(commentaireId, agentId);
    if (!canEdit) {
      return {
        success: false,
        error: "Vous ne pouvez modifier que vos propres commentaires.",
      };
    }

    // Validation du message
    if (!message || message.trim().length === 0) {
      return {
        success: false,
        error: "Le message ne peut pas être vide.",
      };
    }

    if (message.length > 5000) {
      return {
        success: false,
        error: "Le message ne peut pas dépasser 5000 caractères.",
      };
    }

    try {
      // Mettre à jour le commentaire
      await parcoursCommentairesRepo.updateMessage(commentaireId, message.trim());

      // Récupérer les détails mis à jour
      const commentaireDetail = await parcoursCommentairesRepo.findByIdWithDetails(commentaireId);

      if (!commentaireDetail) {
        return {
          success: false,
          error: "Erreur lors de la mise à jour du commentaire.",
        };
      }

      return {
        success: true,
        commentaire: commentaireDetail,
      };
    } catch (error) {
      console.error("Erreur lors de la mise à jour du commentaire:", error);
      return {
        success: false,
        error: "Une erreur est survenue lors de la mise à jour du commentaire.",
      };
    }
  }

  /**
   * Supprime un commentaire
   * Seul l'auteur du commentaire peut le supprimer
   *
   * @param commentaireId - ID du commentaire à supprimer
   * @param agentId - ID de l'agent demandant la suppression
   * @param role - Rôle de l'agent
   */
  async deleteCommentaire(
    commentaireId: string,
    agentId: string,
    role: UserRole
  ): Promise<DeleteCommentaireResult> {
    // Vérifier la permission de suppression
    if (!hasPermission(role, BackofficePermission.COMMENTAIRES_DELETE_OWN)) {
      return {
        success: false,
        error: "Permission refusée : vous ne pouvez pas supprimer ce commentaire.",
      };
    }

    // Vérifier que le commentaire existe
    const commentaireExists = await parcoursCommentairesRepo.exists(commentaireId);
    if (!commentaireExists) {
      return {
        success: false,
        error: "Ce commentaire n'existe pas ou a déjà été supprimé.",
      };
    }

    // Vérifier que l'agent est l'auteur du commentaire
    const canDelete = await parcoursCommentairesRepo.canEditComment(commentaireId, agentId);
    if (!canDelete) {
      return {
        success: false,
        error: "Vous ne pouvez supprimer que vos propres commentaires.",
      };
    }

    try {
      const deleted = await parcoursCommentairesRepo.delete(commentaireId);

      if (!deleted) {
        return {
          success: false,
          error: "Le commentaire n'a pas pu être supprimé.",
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      console.error("Erreur lors de la suppression du commentaire:", error);
      return {
        success: false,
        error: "Une erreur est survenue lors de la suppression du commentaire.",
      };
    }
  }
}

// Export d'une instance singleton
export const commentairesService = new CommentairesService();
