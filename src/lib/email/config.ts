import { isLocal } from "../config/env.config";

export const emailConfig = {
  apiKey: process.env.BREVO_API_KEY || "",
  from: {
    email:
      process.env.EMAIL_FROM || "noreply@fonds-prevention-argile.beta.gouv.fr",
    name: "Fonds prévention argile",
  },
  replyTo: {
    email: "contact@fonds-prevention-argile.beta.gouv.fr",
    name: "Support Fonds prévention argile",
  },
  smtp: {
    host: process.env.SMTP_HOST || "localhost",
    port: Number(process.env.SMTP_PORT) || 1025,
  },
};

export function isEmailEnabled(): boolean {
  return !!process.env.BREVO_API_KEY;
}

export function isLocalDevelopment(): boolean {
  return isLocal() || !process.env.BREVO_API_KEY;
}
