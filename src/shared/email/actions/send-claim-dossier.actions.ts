"use server";

import { ActionResult } from "@/shared/types";
import { renderEmailTemplate } from "../utils/render-template.utils";
import { ClaimDossierTemplate } from "../templates/claim-dossier.template";
import { emailService } from "../services/email.service";

/**
 * Envoie au demandeur un mail l'invitant à finaliser son inscription via
 * FranceConnect (cas Aller-vers : dossier pré-créé par un agent).
 */
export async function sendClaimDossierEmail(params: {
  demandeurEmail: string;
  demandeurPrenom: string;
  claimUrl: string;
}): Promise<ActionResult<{ messageId?: string }>> {
  try {
    const { demandeurEmail, demandeurPrenom, claimUrl } = params;

    const html = await renderEmailTemplate(
      ClaimDossierTemplate({
        demandeurPrenom,
        claimUrl,
      })
    );

    const result = await emailService.sendEmail({
      to: demandeurEmail,
      subject: "Finalisez votre inscription au Fonds Prévention Argile",
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
