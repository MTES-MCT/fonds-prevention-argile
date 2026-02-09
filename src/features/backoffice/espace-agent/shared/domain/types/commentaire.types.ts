/**
 * Type de structure de l'agent auteur du commentaire
 */
export type StructureType = "AMO" | "ALLERS_VERS" | "DDT" | "ADMINISTRATION";

/**
 * Détails d'un commentaire avec informations de l'agent auteur
 * Utilisé pour l'affichage dans l'interface
 */
export interface CommentaireDetail {
  id: string;
  parcoursId: string;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  agent: {
    id: string;
    givenName: string;
    usualName: string | null;
    role: string;
    structureType: StructureType; // Type de structure (AMO, Allers-Vers, DDT, Admin)
    structureName: string | null; // Nom de l'entreprise AMO, structure Allers-Vers, etc.
  };
}

/**
 * Données du formulaire de création/édition de commentaire
 */
export interface CommentaireFormData {
  message: string;
}

/**
 * Filtres pour la récupération des commentaires (pour évolutions futures)
 */
export interface CommentaireFilters {
  parcoursId?: string;
  agentId?: string;
  dateDebut?: Date;
  dateFin?: Date;
}

/**
 * Résultat de la création d'un commentaire
 */
export interface CreateCommentaireResult {
  success: boolean;
  commentaire?: CommentaireDetail;
  error?: string;
}

/**
 * Résultat de la mise à jour d'un commentaire
 */
export interface UpdateCommentaireResult {
  success: boolean;
  commentaire?: CommentaireDetail;
  error?: string;
}

/**
 * Résultat de la suppression d'un commentaire
 */
export interface DeleteCommentaireResult {
  success: boolean;
  error?: string;
}

/**
 * Liste de commentaires pour un parcours
 */
export interface CommentairesListResult {
  commentaires: CommentaireDetail[];
  totalCount: number;
}
