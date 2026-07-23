"use server";

import { revalidatePath } from "next/cache";
import { ActionResult } from "@/shared/types/action-result.types";
import {
  approveValidation,
  rejectEligibility,
  declineAccompagnementEligible,
} from "@/features/parcours/amo/services/amo-validation.service";
import { getDemandeDetail } from "../services/demande-detail.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { buildAuthorSnapshot } from "@/features/backoffice/espace-agent/shared/services/author-snapshot";
import { parcoursActionsRepo } from "@/shared/database/repositories";
import {
  ACTION_TYPE_ELIGIBILITE_ACCEPTEE,
  ACTION_TYPE_ELIGIBILITE_REFUSEE,
  ACTION_TYPE_ACCOMPAGNEMENT_REFUSE_ELIGIBLE,
} from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { UserRole } from "@/shared/domain/value-objects";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { eq, ne, asc, and as drizzleAnd } from "drizzle-orm";
import type { DemandeDetail } from "../domain/types";

/**
 * Trace le choix d'éligibilité de l'AMO dans l'historique (`parcours_actions`).
 * Best-effort : un échec d'audit ne doit pas invalider la décision déjà enregistrée.
 */
async function logDecisionAction(parcoursId: string, actionType: string, message?: string | null): Promise<void> {
  try {
    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return;
    const snapshot = await buildAuthorSnapshot(agentResult.data);
    await parcoursActionsRepo.create({
      parcoursId,
      agentId: agentResult.data.id,
      actionType,
      message: message || null,
      authorName: snapshot.authorName,
      authorStructure: snapshot.authorStructure,
      authorStructureType: snapshot.authorStructureType,
    });
  } catch (error) {
    console.error("[logDecisionAction] audit best-effort échoué:", error);
  }
}

/**
 * Vérifie que l'agent AMO connecté est bien propriétaire de la demande
 * Les admins peuvent tout valider, les AMO seulement leurs propres demandes
 */
async function verifyAmoOwnership(demandeId: string): Promise<ActionResult<{ entrepriseAmoId: string }>> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: "Non authentifié" };
  }

  // Les admins peuvent tout valider
  if (user.role === UserRole.SUPER_ADMINISTRATEUR || user.role === UserRole.ADMINISTRATEUR) {
    return { success: true, data: { entrepriseAmoId: "" } };
  }

  // Pour les AMO, vérifier que la demande leur appartient
  const canAccessDemandes = user.role === UserRole.AMO || user.role === UserRole.AMO_ET_ALLERS_VERS;
  if (!canAccessDemandes) {
    return { success: false, error: "Accès réservé aux AMO" };
  }

  if (!user.entrepriseAmoId) {
    return { success: false, error: "Votre compte AMO n'est pas configuré" };
  }

  // Récupérer l'entrepriseAmoId de la demande
  const [demande] = await db
    .select({ entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.id, demandeId))
    .limit(1);

  if (!demande) {
    return { success: false, error: "Demande non trouvée" };
  }

  if (demande.entrepriseAmoId !== user.entrepriseAmoId) {
    return { success: false, error: "Cette demande ne vous est pas destinée" };
  }

  return { success: true, data: { entrepriseAmoId: demande.entrepriseAmoId } };
}

/**
 * Récupérer les données détaillées d'une demande
 */
export async function getDemandeDetailAction(demandeId: string): Promise<ActionResult<DemandeDetail>> {
  try {
    return await getDemandeDetail(demandeId);
  } catch (error) {
    console.error("Erreur getDemandeDetailAction:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération de la demande",
    };
  }
}

/**
 * Valider que le logement est éligible et accepter l'accompagnement
 */
export async function accepterAccompagnement(
  demandeId: string,
  commentaire?: string,
  estMandataireFinancier?: boolean
): Promise<ActionResult<{ message: string; alreadyProcessed: boolean; valideeAt: Date }>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    // Vérifier que l'agent AMO est propriétaire de cette demande
    const ownershipCheck = await verifyAmoOwnership(demandeId);
    if (!ownershipCheck.success) {
      return { success: false, error: ownershipCheck.error };
    }

    const result = await approveValidation(demandeId, commentaire, estMandataireFinancier);
    if (result.success && !result.data.alreadyProcessed) {
      await logDecisionAction(result.data.parcoursId, ACTION_TYPE_ELIGIBILITE_ACCEPTEE, commentaire || null);
    }
    return result;
  } catch (error) {
    console.error("Erreur accepterAccompagnement:", error);
    return {
      success: false,
      error: "Erreur lors de l'acceptation de l'accompagnement",
    };
  }
}

/**
 * Refuser le logement (non éligible)
 */
export async function refuserDemandeNonEligible(
  demandeId: string,
  commentaire: string
): Promise<ActionResult<{ message: string; alreadyProcessed: boolean; valideeAt: Date }>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    // Vérifier que l'agent AMO est propriétaire de cette demande
    const ownershipCheck = await verifyAmoOwnership(demandeId);
    if (!ownershipCheck.success) {
      return { success: false, error: ownershipCheck.error };
    }

    // Validation côté serveur
    if (!commentaire || commentaire.trim().length < 10) {
      return {
        success: false,
        error: "Un commentaire détaillé est requis pour justifier l'inéligibilité (minimum 10 caractères)",
      };
    }

    const result = await rejectEligibility(demandeId, commentaire);
    if (result.success && !result.data.alreadyProcessed) {
      await logDecisionAction(result.data.parcoursId, ACTION_TYPE_ELIGIBILITE_REFUSEE, commentaire);
    }
    return result;
  } catch (error) {
    console.error("Erreur refuserDemandeNonEligible:", error);
    return {
      success: false,
      error: "Erreur lors du refus pour non éligibilité",
    };
  }
}

/**
 * Demandeur éligible, mais l'AMO refuse de l'accompagner (ex. injoignable).
 * Archive le dossier avec la raison saisie (modale « Archiver ») et trace l'action.
 */
export async function refuserAccompagnementEligible(
  demandeId: string,
  archiveReason: string,
  note?: string
): Promise<ActionResult<{ message: string; alreadyProcessed: boolean; valideeAt: Date }>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const ownershipCheck = await verifyAmoOwnership(demandeId);
    if (!ownershipCheck.success) {
      return { success: false, error: ownershipCheck.error };
    }

    const reason = archiveReason?.trim();
    if (!reason) {
      return { success: false, error: "Une raison d'archivage est requise" };
    }

    const agentResult = await getCurrentAgent();
    if (!agentResult.success) {
      return { success: false, error: agentResult.error };
    }

    const noteClean = note?.trim() || null;
    const result = await declineAccompagnementEligible(demandeId, reason, noteClean, agentResult.data.id);
    if (!result.success) return result;

    if (!result.data.alreadyProcessed) {
      await logDecisionAction(
        result.data.parcoursId,
        ACTION_TYPE_ACCOMPAGNEMENT_REFUSE_ELIGIBLE,
        noteClean ? `${reason} — ${noteClean}` : reason
      );
      revalidatePath("/espace-agent", "layout");
    }

    // Ne pas exposer parcoursId au client.
    return {
      success: true,
      data: {
        message: result.data.message,
        alreadyProcessed: result.data.alreadyProcessed,
        valideeAt: result.data.valideeAt,
      },
    };
  } catch (error) {
    console.error("Erreur refuserAccompagnementEligible:", error);
    return {
      success: false,
      error: "Erreur lors du refus d'accompagnement",
    };
  }
}

/**
 * Récupère l'ID du prochain demandeur en attente (différent de celui actuel)
 * Retourne null s'il n'y a plus de demandes en attente
 */
export async function getNextDemandeurEnAttente(
  currentDemandeId: string
): Promise<ActionResult<{ nextDemandeId: string | null }>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    // Pour les admins, on ne filtre pas par entreprise
    const isAdmin = user.role === UserRole.SUPER_ADMINISTRATEUR || user.role === UserRole.ADMINISTRATEUR;

    if (!isAdmin && !user.entrepriseAmoId) {
      return { success: false, error: "Votre compte AMO n'est pas configuré" };
    }

    const { StatutValidationAmo } = await import("@/shared/domain/value-objects/statut-validation-amo.enum");

    // Construire la requête pour récupérer la prochaine demande en attente
    const conditions = [
      eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE),
      ne(parcoursAmoValidations.id, currentDemandeId),
    ];

    // Filtrer par entreprise AMO si ce n'est pas un admin
    if (!isAdmin && user.entrepriseAmoId) {
      conditions.push(eq(parcoursAmoValidations.entrepriseAmoId, user.entrepriseAmoId));
    }

    const [nextDemande] = await db
      .select({ id: parcoursAmoValidations.id })
      .from(parcoursAmoValidations)
      .where(drizzleAnd(...conditions))
      .orderBy(asc(parcoursAmoValidations.createdAt))
      .limit(1);

    return {
      success: true,
      data: { nextDemandeId: nextDemande?.id ?? null },
    };
  } catch (error) {
    console.error("Erreur getNextDemandeurEnAttente:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du prochain demandeur",
    };
  }
}
