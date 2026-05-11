"use server";

import { ActionResult } from "@/shared/types";
import { renderEmailTemplate } from "../utils/render-template.utils";
import { ClaimDossierTemplate } from "../templates/claim-dossier.template";
import { emailService } from "../services/email.service";

/**
 * Envoie au demandeur un mail l'invitant à finaliser son inscription via
 * FranceConnect (cas Aller-vers / AMO : dossier pré-créé par un agent).
 */
export async function sendClaimDossierEmail(params: {
  demandeurEmail: string;
  demandeurPrenomNom: string;
  inviterName: string;
  claimUrl: string;
  hasSimulation: boolean;
}): Promise<ActionResult<{ messageId?: string }>> {
  try {
    const { demandeurEmail, demandeurPrenomNom, inviterName, claimUrl, hasSimulation } = params;

    const html = await renderEmailTemplate(
      ClaimDossierTemplate({
        demandeurPrenomNom,
        inviterName,
        claimUrl,
        hasSimulation,
      })
    );

    const result = await emailService.sendEmail({
      to: demandeurEmail,
      subject: `${inviterName} vous invite à créer votre compte Fonds Prévention Argile`,
      html,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Erreur lors de l'envoi de l'email",
      };
    }

    return {
      success: true,
      data: { messageId: result.messageId },
    };
  } catch (error) {
    console.error("Erreur sendClaimDossierEmail:", error);
    return {
      success: false,
      error: "Erreur lors de l'envoi de l'email",
    };
  }
}
