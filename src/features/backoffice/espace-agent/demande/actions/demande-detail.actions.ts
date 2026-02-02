"use server";

import { ActionResult } from "@/shared/types/action-result.types";
import {
  approveValidation,
  rejectEligibility,
  rejectAccompagnement,
} from "@/features/parcours/amo/services/amo-validation.service";
import { getDemandeDetail } from "../services/demande-detail.service";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { eq, ne, asc, and as drizzleAnd } from "drizzle-orm";
import type { DemandeDetail } from "../domain/types";

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
  if (user.role !== UserRole.AMO) {
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
  commentaire?: string
): Promise<ActionResult<{ message: string }>> {
  try {
    // Vérifier que l'agent AMO est propriétaire de cette demande
    const ownershipCheck = await verifyAmoOwnership(demandeId);
    if (!ownershipCheck.success) {
      return { success: false, error: ownershipCheck.error };
    }

    const result = await approveValidation(demandeId, commentaire);
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
): Promise<ActionResult<{ message: string }>> {
  try {
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
 * Refuser l'accompagnement
 */
export async function refuserDemandeAccompagnement(
  demandeId: string,
  commentaire: string
): Promise<ActionResult<{ message: string }>> {
  try {
    // Vérifier que l'agent AMO est propriétaire de cette demande
    const ownershipCheck = await verifyAmoOwnership(demandeId);
    if (!ownershipCheck.success) {
      return { success: false, error: ownershipCheck.error };
    }

    const result = await rejectAccompagnement(demandeId, commentaire);
    return result;
  } catch (error) {
    console.error("Erreur refuserDemandeAccompagnement:", error);
    return {
      success: false,
      error: "Erreur lors du refus de l'accompagnement",
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
