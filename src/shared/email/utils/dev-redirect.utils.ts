/**
 * Redirige le `to:` vers `EMAIL_DEV_INBOX` si la variable est définie.
 * Cf. README "Tester les emails sur staging".
 */
interface RedirectableParams {
  to: string | string[];
  subject: string;
}

export function applyEmailDevRedirect<T extends RedirectableParams>(params: T): T {
  const inbox = process.env.EMAIL_DEV_INBOX;
  if (!inbox) return params;

  const originalTo = Array.isArray(params.to) ? params.to.join(", ") : params.to;
  return {
    ...params,
    to: inbox,
    subject: `[STAGING → ${originalTo}] ${params.subject}`,
  };
}
