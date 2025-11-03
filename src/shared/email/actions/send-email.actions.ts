"use server";

import { getServerEnv } from "@/shared/config/env.config";
import { ActionResult } from "@/shared/types";
import { renderEmailTemplate } from "../utils/render-template.utils";
import { ValidationAmoTemplate } from "../templates/validation-amo.template";
import { emailService } from "../services/email.service";

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
