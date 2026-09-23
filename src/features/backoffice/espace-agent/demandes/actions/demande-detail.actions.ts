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
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
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
import type { Agent } from "@/shared/database/schema/agents";
import { estRaisonPoursuiteAutonome } from "@/features/backoffice/espace-agent/shared/domain/value-objects/raisons-fin-suivi";
import { detacherAmo } from "@/features/parcours/amo/services/detachement-amo.service";
import { estDossierChezLaDdt } from "@/features/parcours/amo/domain/value-objects";
import { peutPasserEnAutonomie } from "@/features/parcours/amo/domain/value-objects/departements-amo";
import { parcoursPreventionRepository } from "@/shared/database/repositories/parcours-prevention.repository";
import { getDossierByStep } from "@/features/parcours/dossiers-ds/services/dossier-ds.service";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";

/**
 * Trace le choix d'éligibilité de l'AMO dans l'historique (`parcours_actions`).
 * La résolution de l'agent est protégée ici : `logSystemAction` n'absorbe que ses
 * propres erreurs, et un audit raté ne doit jamais invalider la décision enregistrée.
 */
async function logDecisionAction(
  parcoursId: string,
  actionType: string,
  message?: string | null,
  agentConnu?: Agent
): Promise<void> {
  try {
    const agent = agentConnu ?? (await getCurrentAgent().then((r) => (r.success ? r.data : null)));
    if (!agent) return;
    await logSystemAction({ parcoursId, author: { agent }, actionType, message });
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

/** Ce que l'AMO renvoie au client après avoir décliné : le dossier est-il garé, ou poursuivi seul ? */
export interface RefusAccompagnementData {
  message: string;
  alreadyProcessed: boolean;
  /** true : l'AMO a été détachée et le dossier reste actif, sans archivage. */
  poursuiteAutonome: boolean;
}

/**
 * Demandeur éligible, mais l'AMO ne l'accompagne pas. **La raison décide de la suite** :
 * « poursuivre sans accompagnement » détache l'AMO, toutes les autres archivent (ADR-0022).
 */
export async function refuserAccompagnementEligible(
  demandeId: string,
  archiveReason: string,
  note?: string
): Promise<ActionResult<RefusAccompagnementData>> {
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

    if (estRaisonPoursuiteAutonome(reason)) {
      return await declinerVersAutonomie(demandeId, reason, noteClean, agentResult.data);
    }

    const result = await declineAccompagnementEligible(demandeId, reason, noteClean, agentResult.data.id);
    if (!result.success) return result;

    if (!result.data.alreadyProcessed) {
      await logDecisionAction(
        result.data.parcoursId,
        ACTION_TYPE_ACCOMPAGNEMENT_REFUSE_ELIGIBLE,
        noteClean ? `${reason} — ${noteClean}` : reason,
        agentResult.data
      );
      revalidatePath("/espace-agent", "layout");
    }

    // Ne pas exposer parcoursId au client.
    return {
      success: true,
      data: {
        message: result.data.message,
        alreadyProcessed: result.data.alreadyProcessed,
        poursuiteAutonome: false,
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
 * Le demandeur poursuit seul : on détache l'AMO au lieu d'archiver, le dossier reste actif et
 * l'aller-vers du territoire en devient responsable.
 *
 * Mêmes deux gardes que « Ne plus accompagner » (ADR-0018) : l'autonomie n'existe pas là où
 * l'AMO est imposé, et rien ne bouge tant que la DDT tient le formulaire d'éligibilité — une
 * demande d'accompagnement faite après une autonomie peut porter un dossier déjà déposé.
 */
async function declinerVersAutonomie(
  demandeId: string,
  reason: string,
  note: string | null,
  agent: Agent
): Promise<ActionResult<RefusAccompagnementData>> {
  const [validation] = await db
    .select({ parcoursId: parcoursAmoValidations.parcoursId })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.id, demandeId))
    .limit(1);

  if (!validation) {
    return { success: false, error: "Demande non trouvée" };
  }

  const parcours = await parcoursPreventionRepository.findById(validation.parcoursId);
  if (!parcours || !peutPasserEnAutonomie(parcours)) {
    return {
      success: false,
      error:
        "L'AMO est obligatoire dans ce département : le demandeur ne peut pas poursuivre seul. Choisissez une raison qui archive le dossier.",
    };
  }

  const dossierEligibilite = await getDossierByStep(validation.parcoursId, Step.ELIGIBILITE);
  if (estDossierChezLaDdt((dossierEligibilite?.dsStatus as DSStatus | null) ?? null)) {
    return {
      success: false,
      error:
        "Le formulaire d'éligibilité a été transmis : l'accompagnement ne peut pas être retiré tant que l'administration n'a pas répondu",
    };
  }

  const result = await detacherAmo({ parcoursId: validation.parcoursId });
  if (!result.success) return { success: false, error: result.error };

  // Un seul geste de l'AMO, une seule ligne d'historique : l'issue enrichit le message.
  await logDecisionAction(
    validation.parcoursId,
    ACTION_TYPE_ACCOMPAGNEMENT_REFUSE_ELIGIBLE,
    [reason, note, "Le demandeur poursuit sans accompagnement."].filter(Boolean).join(" — "),
    agent
  );
  revalidatePath("/espace-agent", "layout");

  return {
    success: true,
    data: {
      message: "Le demandeur poursuit son parcours sans accompagnement.",
      alreadyProcessed: false,
      poursuiteAutonome: true,
    },
  };
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
