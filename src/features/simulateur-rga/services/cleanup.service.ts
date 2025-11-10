/**
 * Service de nettoyage des données RGA (RGPD)
 * Gère la suppression des données de simulation après envoi à DS
 */

import { parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types";
import { RGADeletionReason } from "@/features/simulateur-rga/domain/types/rga-simulation.types";
import { RGA_RETENTION_DAYS } from "../domain/value-objects/rga-retention.config";

/**
 * Supprime les données RGA d'un parcours après envoi à Démarches Simplifiées
 * Marque la suppression avec timestamp et raison pour audit RGPD
 */
export async function cleanupRGADataAfterDS(
  parcoursId: string
): Promise<ActionResult<void>> {
  try {
    console.log(
      `[Cleanup] Suppression des données RGA pour le parcours ${parcoursId}`
    );

    // Utiliser la méthode dédiée du repository pour supprimer les données RGA
    const result = await parcoursRepo.deleteRGAData(
      parcoursId,
      RGADeletionReason.SENT_TO_DS
    );

    if (!result) {
      console.error(
        `[Cleanup] Parcours ${parcoursId} non trouvé ou suppression échouée`
      );
      return {
        success: false,
        error: "Parcours non trouvé",
      };
    }

    console.log(
      `[Cleanup] Données RGA supprimées avec succès pour le parcours ${parcoursId}`
    );

    return {
      success: true,
      data: undefined,
    };
  } catch (error) {
    console.error(
      `[Cleanup] Erreur lors de la suppression des données RGA:`,
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors de la suppression des données RGA",
    };
  }
}

/**
 * Supprime les données RGA expirées (après RGA_RETENTION_DAYS jours sans finalisation)
 */
export async function cleanupExpiredRGAData(
  retentionDays: number = RGA_RETENTION_DAYS
): Promise<ActionResult<{ deletedCount: number }>> {
  try {
    console.log(
      `[Cleanup] Recherche des données RGA expirées (>${retentionDays} jours)`
    );

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() - retentionDays);

    // TODO: Implémenter la recherche et suppression des parcours expirés
    // Pour l'instant, on retourne 0
    // Cette fonction sera complétée dans la Phase 5 de la todo liste

    console.log(`[Cleanup] Nettoyage des données expirées à implémenter`);

    return {
      success: true,
      data: { deletedCount: 0 },
    };
  } catch (error) {
    console.error(
      `[Cleanup] Erreur lors du nettoyage des données expirées:`,
      error
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erreur lors du nettoyage des données expirées",
    };
  }
}
