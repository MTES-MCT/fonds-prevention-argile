import { TransactionalEmailsApi, SendSmtpEmail } from "@getbrevo/brevo";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { emailConfig, isEmailEnabled, isLocalDevelopment } from "./config";

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
 * Service d'envoi d'emails unifié
 * - Local : utilise Mailhog (SMTP)
 * - Staging/Prod : utilise Brevo (API)
 */
export class EmailService {
  private brevoApi?: TransactionalEmailsApi;
  private smtpTransporter?: Transporter;

  constructor() {
    if (isLocalDevelopment()) {
      // Configuration SMTP pour Mailhog (local)
      this.smtpTransporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: false, // Pas de TLS pour Mailhog
        ignoreTLS: true,
      });

      console.log("📧 Email service (local SMTP/Mailhog):", {
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        webUI: "http://localhost:8025",
      });
    } else {
      // Configuration Brevo pour staging/production
      if (!emailConfig.apiKey) {
        console.error("BREVO_API_KEY manquante");
      }

      this.brevoApi = new TransactionalEmailsApi();
      this.brevoApi.setApiKey(0, emailConfig.apiKey);
    }
  }

  /**
   * Envoie un email via SMTP (local) ou Brevo (prod)
   */
  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (isLocalDevelopment()) {
      return this.sendViaSMTP(params);
    } else {
      return this.sendViaBrevo(params);
    }
  }

  /**
   * Envoi via SMTP (Mailhog en local)
   */
  private async sendViaSMTP(params: SendEmailParams): Promise<SendEmailResult> {
    if (!this.smtpTransporter) {
      return {
        success: false,
        error: "SMTP transporter non initialisé",
      };
    }

    try {
      const recipients = Array.isArray(params.to)
        ? params.to.join(", ")
        : params.to;

      const info = await this.smtpTransporter.sendMail({
        from: `${emailConfig.from.name} <${emailConfig.from.email}>`,
        to: recipients,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo
          ? `${params.replyTo.name || ""} <${params.replyTo.email}>`
          : `${emailConfig.replyTo.name} <${emailConfig.replyTo.email}>`,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error("Erreur SMTP:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur SMTP",
      };
    }
  }

  /**
   * Envoi via Brevo (staging/production)
   */
  private async sendViaBrevo(
    params: SendEmailParams
  ): Promise<SendEmailResult> {
    if (!this.brevoApi || !isEmailEnabled()) {
      console.warn("Brevo non configuré (BREVO_API_KEY manquante)");
      return {
        success: false,
        error: "Service email non configuré",
      };
    }

    try {
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

      const result = await this.brevoApi.sendTransacEmail(sendSmtpEmail);

      return {
        success: true,
        messageId: result.body.messageId,
      };
    } catch (error) {
      console.error("Erreur Brevo:", error);

      // Gestion spécifique des erreurs Axios (réseau/API)
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: {
            status: number;
            data: unknown;
          };
        };

        if (axiosError.response) {
          console.error("Response error:", {
            status: axiosError.response.status,
            data: axiosError.response.data,
          });
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur Brevo",
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
export const emailService = new EmailService();
