// /src/lib/database/services/dossier-ds-sync.service.ts

import { getDemarchesSimplifieesClient } from "@/lib/api/demarches-simplifiees/graphql";
import { dossierDsRepo, parcoursRepo } from "@/lib/database/repositories";
import { DSStatus, Step, Status } from "@/lib/parcours/parcours.types";
import { mapDSStatusToInternalStatus } from "@/lib/parcours/parcours.helpers";
import type { DossierState } from "@/lib/api/demarches-simplifiees/graphql/types";
import type { DossierDemarchesSimplifiees } from "@/lib/database/schema";

/**
 * Résultat de la synchronisation d'un dossier
 */
export interface SyncResult {
  updated: boolean;
  dossier: DossierDemarchesSimplifiees | null;
  oldStatus?: DSStatus;
  newStatus?: DSStatus;
  error?: string;
}

/**
 * Convertit le statut DS GraphQL vers notre enum DSStatus
 */
function mapGraphQLStatusToDSStatus(state: DossierState): DSStatus {
  const mapping: Record<DossierState, DSStatus> = {
    en_construction: DSStatus.EN_CONSTRUCTION,
    en_instruction: DSStatus.EN_INSTRUCTION,
    accepte: DSStatus.ACCEPTE,
    refuse: DSStatus.REFUSE,
    sans_suite: DSStatus.CLASSE_SANS_SUITE,
  };

  return mapping[state] || DSStatus.EN_CONSTRUCTION;
}

/**
 * Synchronise le statut d'un dossier d'éligibilité avec Démarches Simplifiées
 *
 * @param userId - L'ID de l'utilisateur
 * @param step - L'étape à synchroniser (par défaut ELIGIBILITE)
 * @returns Le résultat de la synchronisation
 */
export async function syncDossierEligibiliteStatus(
  userId: string,
  step: Step = Step.ELIGIBILITE
): Promise<SyncResult> {
  try {
    // 1. Récupérer le parcours de l'utilisateur
    const parcours = await parcoursRepo.findByUserId(userId);

    if (!parcours) {
      return {
        updated: false,
        dossier: null,
        error: "Parcours non trouvé pour cet utilisateur",
      };
    }

    // 2. Récupérer le dossier DS pour cette étape
    const dossier = await dossierDsRepo.findByParcoursAndStep(
      parcours.id,
      step
    );

    if (!dossier || !dossier.dsNumber) {
      return {
        updated: false,
        dossier: null,
        error: `Aucun dossier trouvé pour l'étape ${step}`,
      };
    }

    // 3. Appeler l'API DS pour récupérer le statut actuel
    const client = getDemarchesSimplifieesClient();
    let dossierDS;

    try {
      dossierDS = await client.getDossier(parseInt(dossier.dsNumber));

      // TODO : journaliser la réponse pour le debug
      console.log(`API DS - Dossier ${dossier.dsNumber}:`, {
        state: dossierDS?.state,
        datePassageEnInstruction: dossierDS?.datePassageEnInstruction,
        dateTraitement: dossierDS?.dateTraitement,
      });
    } catch (error: unknown) {
      // Si le dossier n'existe pas sur DS (brouillon ou supprimé)
      if (
        error instanceof Error &&
        (error.message?.includes("not found") ||
          error.message?.includes("Dossier not found"))
      ) {
        console.log(
          `Dossier ${dossier.dsNumber} non accessible via l'API (probablement en brouillon)`
        );

        // On garde le statut EN_CONSTRUCTION en base, pas de changement
        await dossierDsRepo.update(dossier.id, {
          lastSyncAt: new Date(),
        });

        return {
          updated: false,
          dossier,
          error: `Le dossier est encore en brouillon sur Démarches Simplifiées. Il sera synchronisé une fois soumis.`,
        };
      }

      throw error; // Erreur inconnue, on la remonte
    }

    if (!dossierDS) {
      console.error(`Dossier ${dossier.dsNumber} non trouvé sur DS`);
      return {
        updated: false,
        dossier,
        error: `Dossier ${dossier.dsNumber} non trouvé sur Démarches Simplifiées`,
      };
    }

    // 4. Mapper le statut DS vers notre enum
    const newStatus = mapGraphQLStatusToDSStatus(dossierDS.state);
    const oldStatus = dossier.dsStatus;

    // Journaliser les statuts pour le debug
    console.log(`Mapping statut - Dossier ${dossier.dsNumber}:`, {
      stateFromAPI: dossierDS.state,
      mappedStatus: newStatus,
      statusInDB: oldStatus,
      comparison: newStatus === oldStatus,
    });

    // 5. Vérifier si le statut a changé
    if (newStatus === oldStatus) {
      console.log(
        `Pas de changement de statut pour le dossier ${dossier.dsNumber}`,
        `(API: ${dossierDS.state} -> Mapped: ${newStatus} === DB: ${oldStatus})`
      );
      return {
        updated: false,
        dossier,
        oldStatus,
        newStatus,
      };
    }

    console.log(
      `Changement de statut détecté pour le dossier ${dossier.dsNumber}: ${oldStatus} -> ${newStatus}`
    );

    // 6. Mettre à jour le dossier en base
    const updatedDossier = await dossierDsRepo.update(dossier.id, {
      dsStatus: newStatus,
      lastSyncAt: new Date(),
      // Mettre à jour processedAt si le dossier est accepté
      processedAt: newStatus === DSStatus.ACCEPTE ? new Date() : undefined,
    });

    // 7. Si c'est l'étape courante du parcours, mettre à jour le statut du parcours
    if (parcours.currentStep === step) {
      const internalStatus = mapDSStatusToInternalStatus(newStatus);

      // Ne mettre à jour que si le statut interne change aussi
      if (parcours.currentStatus !== internalStatus) {
        await parcoursRepo.update(parcours.id, {
          currentStatus: internalStatus,
          updatedAt: new Date(),
        });

        // Si l'étape est validée, on pourrait progresser automatiquement
        // mais on laisse ça à l'action pour décider
        if (internalStatus === Status.VALIDE) {
          console.log(`Étape ${step} validée, prêt pour progression`);
        }
      }
    }

    return {
      updated: true,
      dossier: updatedDossier,
      oldStatus,
      newStatus,
    };
  } catch (error) {
    console.error("Erreur lors de la synchronisation du dossier:", error);

    return {
      updated: false,
      dossier: null,
      error:
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de la synchronisation",
    };
  }
}

/**
 * Synchronise tous les dossiers d'un parcours
 * Utile pour un job batch ou une synchro complète
 */
export async function syncAllDossiersForUser(userId: string): Promise<{
  results: SyncResult[];
  totalUpdated: number;
}> {
  const steps = [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];
  const results: SyncResult[] = [];
  let totalUpdated = 0;

  for (const step of steps) {
    const result = await syncDossierEligibiliteStatus(userId, step);
    results.push(result);

    if (result.updated) {
      totalUpdated++;
    }
  }

  return {
    results,
    totalUpdated,
  };
}

/**
 * Vérifie si une synchronisation est nécessaire
 * (par exemple si la dernière synchro date de plus de X minutes)
 */
export async function needsSync(
  userId: string,
  step: Step = Step.ELIGIBILITE,
  maxAgeMinutes: number = 5
): Promise<boolean> {
  try {
    const parcours = await parcoursRepo.findByUserId(userId);
    if (!parcours) return false;

    const dossier = await dossierDsRepo.findByParcoursAndStep(
      parcours.id,
      step
    );

    if (!dossier || !dossier.dsNumber) return false;

    // Si jamais synchronisé, on doit synchroniser
    if (!dossier.lastSyncAt) return true;

    // Vérifier l'âge de la dernière synchro
    const ageInMinutes =
      (Date.now() - dossier.lastSyncAt.getTime()) / (1000 * 60);

    return ageInMinutes > maxAgeMinutes;
  } catch (error) {
    console.error("Erreur lors de la vérification du besoin de sync:", error);
    return false;
  }
}
