import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";
import { emailConfig, isEmailEnabled } from "./config";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: {
    email: string;
    name?: string;
  };
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Service d'envoi d'emails via Brevo
 */
export class BrevoEmailService {
  private apiInstance: TransactionalEmailsApi;

  constructor() {
    if (!emailConfig.apiKey) {
      console.error(
        "BREVO_API_KEY manquante dans les variables d'environnement"
      );
    }

    this.apiInstance = new TransactionalEmailsApi();

    // Méthode correcte pour définir la clé API
    this.apiInstance.setApiKey(
      0, // Type de clé (0 = api-key)
      emailConfig.apiKey
    );
  }

  /**
   * Envoie un email via Brevo
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (!isEmailEnabled()) {
      console.warn("Envoi d'email désactivé (BREVO_API_KEY manquant)");
      console.log("Email non envoyé:", {
        to: params.to,
        subject: params.subject,
      });
      return {
        success: false,
        error: "Service email non configuré - BREVO_API_KEY manquante",
      };
    }

    try {
      // Normaliser les destinataires
      const recipients = Array.isArray(params.to)
        ? params.to.map((email) => ({ email }))
        : [{ email: params.to }];

      const sendSmtpEmail: SendSmtpEmail = {
        sender: {
          email: emailConfig.from.email,
          name: emailConfig.from.name,
        },
        to: recipients,
        subject: params.subject,
        htmlContent: params.html,
        textContent: params.text,
        replyTo: params.replyTo || emailConfig.replyTo,
      };

      const result = await this.apiInstance.sendTransacEmail(sendSmtpEmail);

      return {
        success: true,
        messageId: result.body.messageId,
      };
    } catch (error: any) {
      console.error("Erreur lors de l'envoi d'email:", error);

      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

  /**
   * Envoie un email avec un template
   */
  async sendTemplateEmail(params: {
    to: string | string[];
    subject: string;
    template: string;
    replyTo?: { email: string; name?: string };
  }): Promise<SendEmailResult> {
    return this.sendEmail({
      to: params.to,
      subject: params.subject,
      html: params.template,
      replyTo: params.replyTo,
    });
  }
}

// Instance singleton
export const brevoService = new BrevoEmailService();
