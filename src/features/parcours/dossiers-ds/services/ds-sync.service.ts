import { graphqlClient } from "../adapters/graphql/client";
import { getDossierByStep, updateDossierStatus } from "./dossier-ds.service";
import type { Step } from "../../core/domain/value-objects/step";
import { DS_TO_INTERNAL_STATUS, DSStatus } from "../domain/value-objects/ds-status";
import { parcoursRepo } from "@/shared/database/repositories";
import type { ActionResult } from "@/shared/types";

/**
 * Service de synchronisation des statuts DS
 */

interface SyncResult {
  updated: boolean;
  oldStatus?: DSStatus;
  newStatus?: DSStatus;
}

/**
 * Synchronise le statut d'un dossier DS avec l'API
 */
export async function syncDossierStatus(
  parcoursId: string,
  step: Step,
  dsNumber: string
): Promise<ActionResult<SyncResult>> {
  try {
    // Récupérer le dossier local
    const localDossier = await getDossierByStep(parcoursId, step);

    if (!localDossier) {
      return {
        success: false,
        error: "Dossier local non trouvé",
      };
    }

    // Récupérer le statut depuis DS
    const dsStatus = await graphqlClient.getDossierStatus(Number(dsNumber));

    if (!dsStatus) {
      return {
        success: false,
        error: "Impossible de récupérer le statut DS",
      };
    }

    const newStatus = dsStatus as DSStatus;
    const oldStatus = localDossier.dsStatus as DSStatus;

    // Si le statut a changé, mettre à jour
    if (newStatus !== oldStatus) {
      await updateDossierStatus(localDossier.id, newStatus);

      // Mettre à jour le statut du parcours si nécessaire
      const internalStatus = DS_TO_INTERNAL_STATUS[newStatus];
      await parcoursRepo.updateStatus(parcoursId, internalStatus);

      return {
        success: true,
        data: {
          updated: true,
          oldStatus,
          newStatus,
        },
      };
    }

    return {
      success: true,
      data: {
        updated: false,
        oldStatus,
        newStatus: oldStatus,
      },
    };
  } catch (error) {
    console.error("Erreur syncDossierStatus:", error);
    return {
      success: false,
      error: "Erreur lors de la synchronisation",
    };
  }
}

const SYNC_STALE_AFTER_MS = 5 * 60 * 1000;
const SYNC_CONCURRENCY = 5;

interface SyncListItem {
  parcoursId: string;
  step: Step;
  dsNumber: string | null;
  lastSyncAt: Date | null;
}

/**
 * Synchronise en parallèle (concurrence limitée) une liste de dossiers
 * en sautant ceux synchronisés récemment (throttling via lastSyncAt).
 * Les erreurs par dossier sont logguées dans syncDossierStatus mais ne bloquent pas les autres.
 */
export async function syncDossiersList(
  items: SyncListItem[],
  options?: { staleAfterMs?: number; concurrency?: number }
): Promise<{ totalSynced: number; totalUpdated: number; totalSkipped: number }> {
  const staleAfterMs = options?.staleAfterMs ?? SYNC_STALE_AFTER_MS;
  const concurrency = options?.concurrency ?? SYNC_CONCURRENCY;
  const now = Date.now();

  const toSync = items.filter(
    (i): i is SyncListItem & { dsNumber: string } =>
      !!i.dsNumber && (!i.lastSyncAt || now - i.lastSyncAt.getTime() > staleAfterMs)
  );
  const totalSkipped = items.length - toSync.length;

  let totalUpdated = 0;
  for (let i = 0; i < toSync.length; i += concurrency) {
    const chunk = toSync.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map((item) => syncDossierStatus(item.parcoursId, item.step, item.dsNumber))
    );
    totalUpdated += results.filter((r) => r.success && r.data?.updated).length;
  }

  return { totalSynced: toSync.length, totalUpdated, totalSkipped };
}

/**
 * Synchronise tous les dossiers d'un parcours
 */
export async function syncAllDossiers(
  parcoursId: string,
  dossiers: Array<{ id: string; step: Step; dsNumber: string | null }>
): Promise<ActionResult<{ totalUpdated: number }>> {
  try {
    let totalUpdated = 0;

    for (const dossier of dossiers) {
      if (!dossier.dsNumber) continue;

      const result = await syncDossierStatus(parcoursId, dossier.step, dossier.dsNumber);

      if (result.success && result.data?.updated) {
        totalUpdated++;
      }
    }

    return {
      success: true,
      data: { totalUpdated },
    };
  } catch (error) {
    console.error("Erreur syncAllDossiers:", error);
    return {
      success: false,
      error: "Erreur lors de la synchronisation complète",
    };
  }
}
