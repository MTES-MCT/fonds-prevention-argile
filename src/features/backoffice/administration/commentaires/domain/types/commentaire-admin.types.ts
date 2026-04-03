import type { StructureType } from "@/features/backoffice/espace-agent/shared/domain/types/commentaire.types";

/**
 * Detail d'un commentaire pour la vue administration
 * Inclut les informations du demandeur associe au parcours
 */
export interface CommentaireAdminDetail {
  id: string;
  parcoursId: string;
  message: string;
  createdAt: Date;
  editedAt: Date | null;
  authorName: string;
  authorStructure: string | null;
  authorStructureType: StructureType | null;
  demandeur: {
    nom: string | null;
    prenom: string | null;
  };
}

/**
 * Filtres pour la liste admin des commentaires
 */
export interface CommentairesAdminFilters {
  page: number;
  pageSize: number;
  dateDebut?: string;
  dateFin?: string;
  authorStructureType?: StructureType;
  searchQuery?: string;
}

/**
 * Resultat pagine de la liste admin des commentaires
 */
export interface CommentairesAdminListResult {
  commentaires: CommentaireAdminDetail[];
  totalCount: number;
}
