"use server";

import { getServerEnv } from "@/shared/config/env.config";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { sendClaimDossierEmail } from "@/shared/email/actions/send-claim-dossier.actions";
import type { ActionResult } from "@/shared/types";
import { getInviterName } from "../services/inviter-name.service";

/**
 * Envoie (ou pas) l'email d'invitation au demandeur après création du dossier
 * et éventuelle simulation par l'agent. Utilisé à l'étape finale du wizard
 * (mode "avec simulation"), accessible aux agents AMO et Aller-vers.
 */
export async function sendInvitationEmailAction(
  parcoursId: string,
  sendEmail: boolean
): Promise<ActionResult<{ emailSent: boolean }>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non authentifié" };

    const role = user.role as UserRole;
    if (!hasPermission(role, BackofficePermission.DOSSIERS_CREATE)) {
      return { success: false, error: "Permission refusée" };
    }

    if (!sendEmail) {
      return { success: true, data: { emailSent: false } };
    }

    if (!user.agentId) {
      return { success: false, error: "Agent non configuré" };
    }

    const parcours = await parcoursRepo.findById(parcoursId);
    if (!parcours) return { success: false, error: "Parcours introuvable" };

    const demandeur = await userRepo.findById(parcours.userId);
    if (!demandeur || !demandeur.claimToken || !demandeur.email) {
      return { success: false, error: "Demandeur ou claim token introuvable" };
    }

    const claimUrl = `${getServerEnv().BASE_URL}/claim-dossier/${demandeur.claimToken}`;
    const inviterName = await getInviterName(user.agentId);
    const demandeurPrenomNom = `${demandeur.prenom ?? ""} ${demandeur.nom ?? ""}`.trim();

    const result = await sendClaimDossierEmail({
      demandeurEmail: demandeur.email,
      demandeurPrenomNom,
      inviterName,
      claimUrl,
      hasSimulation: !!parcours.rgaSimulationDataAgent,
    });

    return { success: true, data: { emailSent: result.success } };
  } catch (error) {
    console.error("[sendInvitationEmailAction] Erreur:", error);
    return { success: false, error: "Erreur lors de l'envoi de l'email" };
  }
}
