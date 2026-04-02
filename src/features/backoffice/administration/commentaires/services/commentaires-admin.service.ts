import { parcoursCommentairesRepo } from "@/shared/database/repositories/parcours-commentaires.repository";
import type { CommentairesAdminFilters, CommentairesAdminListResult } from "../domain/types/commentaire-admin.types";

/**
 * Recupere la liste paginee des commentaires pour l'administration
 */
export async function getCommentairesAdmin(filters: CommentairesAdminFilters): Promise<CommentairesAdminListResult> {
  const { page, pageSize, dateDebut, dateFin, authorStructureType, searchQuery } = filters;

  const offset = (page - 1) * pageSize;

  const result = await parcoursCommentairesRepo.findAllWithDetails({
    limit: pageSize,
    offset,
    dateDebut: dateDebut ? new Date(dateDebut) : undefined,
    dateFin: dateFin ? new Date(dateFin + "T23:59:59.999Z") : undefined,
    authorStructureType,
    searchQuery: searchQuery?.trim() || undefined,
  });

  return {
    commentaires: result.items,
    totalCount: result.totalCount,
  };
}
