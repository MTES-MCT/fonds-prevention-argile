"use server";

import { emailService } from "@/lib/email/email.service";
import { renderEmailTemplate } from "@/lib/email/render-template";
import { ValidationAmoTemplate } from "@/lib/email/templates/validation-amo.template";
import type { ActionResult } from "@/lib/actions/types";
import { getServerEnv } from "@/lib/config/env.config";

/**
 * Envoie un email de validation à un AMO
 */
export async function sendValidationAmoEmail(params: {
  amoEmail: string | string[]; // Peut envoyer à plusieurs emails
  amoNom: string;
  demandeurNom: string;
  demandeurPrenom: string;
  demandeurCodeInsee: string;
  adresseLogement: string;
  token: string;
}): Promise<ActionResult<{ messageId?: string }>> {
  try {
    const { amoEmail, demandeurNom, demandeurPrenom, token } = params;

    // Générer le lien de validation
    const baseUrl = getServerEnv().BASE_URL;
    const lienValidation = `${baseUrl}/amo/validation/${token}`;

    // Render le template React en HTML
    const html = await renderEmailTemplate(
      ValidationAmoTemplate({
        lienValidation,
      })
    );

    // Envoyer l'email via Brevo
    const result = await emailService.sendEmail({
      to: amoEmail,
      subject: `Nouvelle demande d'accompagnement - ${demandeurPrenom} ${demandeurNom}`,
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
    console.error("Erreur sendValidationAmoEmail:", error);
    return {
      success: false,
      error: "Erreur lors de l'envoi de l'email",
    };
  }
}
