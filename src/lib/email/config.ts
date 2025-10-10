import { getServerEnv } from "../config/env.config";

export const emailConfig = {
  apiKey: getServerEnv().BREVO_API_KEY || "",
  from: {
    email:
      getServerEnv().EMAIL_FROM || "noreply@fonds-prevention-argile.gouv.fr",
    name: "Fonds Prévention Argile",
  },
  replyTo: {
    email: "contact@fonds-prevention-argile.beta.gouv.fr",
    name: "Support Fonds Prévention Argile",
  },
};

export function isEmailEnabled(): boolean {
  return !!getServerEnv().BREVO_API_KEY;
}
