"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import { parcoursRepo, parcoursActionsRepo } from "@/shared/database/repositories";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { calculateAgentScope, canReopenRefusedDemande } from "@/features/auth/permissions/services/agent-scope.service";
import { reouvrirDemandeRefusee } from "@/features/parcours/amo/services/reouverture-demande.service";
import { buildAuthorSnapshot } from "@/features/backoffice/espace-agent/shared/services/author-snapshot";
import { ACTION_TYPE_DOSSIER_REOUVERT } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { ROLES_REOUVERTURE } from "@/features/backoffice/espace-agent/dossiers/domain/reouverture";
import type { ActionResult } from "@/shared/types";

/**
 * Ré-ouvre une demande refusée par l'AMO (« changement d'avis » du demandeur).
 * Réservé au super-admin, à l'AMO de l'entreprise rattachée et à l'Aller-vers
 * couvrant le territoire (garde `canReopenRefusedDemande`). La mutation métier est
 * déléguée au service partagé `reouvrirDemandeRefusee` ; l'action ajoute le contrôle
 * d'accès, l'audit (`parcours_actions`) et la revalidation.
 */
export async function reouvrirDemandeAction(parcoursId: string): Promise<ActionResult<void>> {
  try {
    const agentResult = await getCurrentAgent();
    if (!agentResult.success) return { success: false, error: agentResult.error };
    const agent = agentResult.data;

    // Exception assumée au read-only super-admin : la ré-ouverture lui est ouverte
    // (ainsi qu'aux AMO/AV). On ne passe donc PAS par assertNotSuperAdminReadOnly.
    if (!ROLES_REOUVERTURE.includes(agent.role)) {
      return { success: false, error: "Action réservée aux AMO, Allers-vers et super-administrateurs." };
    }

    const parcours = await parcoursRepo.findById(parcoursId);
    if (!parcours) return { success: false, error: "Dossier introuvable" };

    const [validation] = await db
      .select({ entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId })
      .from(parcoursAmoValidations)
      .where(eq(parcoursAmoValidations.parcoursId, parcoursId))
      .limit(1);

    const scope = await calculateAgentScope({
      id: agent.id,
      role: agent.role,
      entrepriseAmoId: agent.entrepriseAmoId ?? null,
      allersVersId: agent.allersVersId ?? null,
    });

    if (!canReopenRefusedDemande(scope, { entrepriseAmoId: validation?.entrepriseAmoId ?? null, parcours })) {
      return {
        success: false,
        error: "Action réservée au responsable du dossier ou à un Aller-vers de son territoire.",
      };
    }

    const result = await reouvrirDemandeRefusee({ parcoursId, sendEmailToAmo: true });
    if (!result.success) return { success: false, error: result.error };

    // Audit : qui a ré-ouvert et quand.
    const snapshot = await buildAuthorSnapshot(agent);
    await parcoursActionsRepo.create({
      parcoursId,
      agentId: agent.id,
      actionType: ACTION_TYPE_DOSSIER_REOUVERT,
      message: `Demande ré-ouverte${result.data.emailSent ? " (email de validation renvoyé à l'AMO)" : ""}.`,
      authorName: snapshot.authorName,
      authorStructure: snapshot.authorStructure,
      authorStructureType: snapshot.authorStructureType,
    });

    revalidatePath("/espace-agent", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("[reouvrirDemandeAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la ré-ouverture de la demande" };
  }
}
