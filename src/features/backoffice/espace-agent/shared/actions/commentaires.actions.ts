"use server";

import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { commentairesService } from "../services/commentaires.service";
import type {
  CommentairesListResult,
  CreateCommentaireResult,
  UpdateCommentaireResult,
  DeleteCommentaireResult,
} from "../domain/types/commentaire.types";

/**
 * Récupère tous les commentaires d'un parcours
 * Vérifie automatiquement les permissions de l'agent connecté
 *
 * @param parcoursId - ID du parcours
 */
export async function getCommentairesAction(
  parcoursId: string
): Promise<CommentairesListResult> {
  try {
    // Récupérer l'agent connecté
    const agentResult = await getCurrentAgent();
    if (!agentResult.success || !agentResult.data) {
      return {
        commentaires: [],
        totalCount: 0,
      };
    }

    const agent = agentResult.data;

    // Appeler le service avec les infos de l'agent
    const result = await commentairesService.getCommentairesForParcours(
      parcoursId,
      agent.id,
      agent.role,
      agent.entrepriseAmoId,
      agent.allersVersId
    );

    return result;
  } catch (error) {
    console.error("Erreur lors de la récupération des commentaires:", error);
    return {
      commentaires: [],
      totalCount: 0,
    };
  }
}

/**
 * Crée un nouveau commentaire sur un parcours
 *
 * @param parcoursId - ID du parcours
 * @param message - Contenu du commentaire
 */
export async function createCommentaireAction(
  parcoursId: string,
  message: string
): Promise<CreateCommentaireResult> {
  try {
    // Récupérer l'agent connecté
    const agentResult = await getCurrentAgent();
    if (!agentResult.success || !agentResult.data) {
      return {
        success: false,
        error: "Vous devez être connecté pour créer un commentaire.",
      };
    }

    const agent = agentResult.data;

    // Appeler le service
    const result = await commentairesService.createCommentaire(
      parcoursId,
      agent.id,
      agent.role,
      message
    );

    return result;
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
 *
 * @param commentaireId - ID du commentaire à modifier
 * @param message - Nouveau contenu
 */
export async function updateCommentaireAction(
  commentaireId: string,
  message: string
): Promise<UpdateCommentaireResult> {
  try {
    // Récupérer l'agent connecté
    const agentResult = await getCurrentAgent();
    if (!agentResult.success || !agentResult.data) {
      return {
        success: false,
        error: "Vous devez être connecté pour modifier un commentaire.",
      };
    }

    const agent = agentResult.data;

    // Appeler le service
    const result = await commentairesService.updateCommentaire(
      commentaireId,
      agent.id,
      agent.role,
      message
    );

    return result;
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
 *
 * @param commentaireId - ID du commentaire à supprimer
 */
export async function deleteCommentaireAction(
  commentaireId: string
): Promise<DeleteCommentaireResult> {
  try {
    // Récupérer l'agent connecté
    const agentResult = await getCurrentAgent();
    if (!agentResult.success || !agentResult.data) {
      return {
        success: false,
        error: "Vous devez être connecté pour supprimer un commentaire.",
      };
    }

    const agent = agentResult.data;

    // Appeler le service
    const result = await commentairesService.deleteCommentaire(
      commentaireId,
      agent.id,
      agent.role
    );

    return result;
  } catch (error) {
    console.error("Erreur lors de la suppression du commentaire:", error);
    return {
      success: false,
      error: "Une erreur est survenue lors de la suppression du commentaire.",
    };
  }
}
