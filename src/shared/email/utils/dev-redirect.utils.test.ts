import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { applyEmailDevRedirect } from "./dev-redirect.utils";

describe("applyEmailDevRedirect", () => {
  const originalInbox = process.env.EMAIL_DEV_INBOX;

  beforeEach(() => {
    delete process.env.EMAIL_DEV_INBOX;
  });

  afterEach(() => {
    if (originalInbox === undefined) {
      delete process.env.EMAIL_DEV_INBOX;
    } else {
      process.env.EMAIL_DEV_INBOX = originalInbox;
    }
  });

  it("no-op si EMAIL_DEV_INBOX absent (cas prod)", () => {
    const params = { to: "user@example.com", subject: "Confirmez votre dossier", html: "..." };
    expect(applyEmailDevRedirect(params)).toEqual(params);
  });

  it("réécrit le `to:` et préfixe le sujet quand EMAIL_DEV_INBOX est set", () => {
    process.env.EMAIL_DEV_INBOX = "test-inbox@example.com";
    const result = applyEmailDevRedirect({
      to: "demandeur.fc.test@franceconnect.fr",
      subject: "Confirmez votre dossier",
      html: "<p>...</p>",
    });
    expect(result.to).toBe("test-inbox@example.com");
    expect(result.subject).toBe(
      "[STAGING → demandeur.fc.test@franceconnect.fr] Confirmez votre dossier"
    );
    expect(result.html).toBe("<p>...</p>");
  });

  it("agrège les destinataires multiples dans le préfixe du sujet", () => {
    process.env.EMAIL_DEV_INBOX = "test-inbox@example.com";
    const result = applyEmailDevRedirect({
      to: ["a@x.fr", "b@y.fr"],
      subject: "Mail groupé",
    });
    expect(result.to).toBe("test-inbox@example.com");
    expect(result.subject).toBe("[STAGING → a@x.fr, b@y.fr] Mail groupé");
  });

  it("préserve les autres champs (replyTo, html, text)", () => {
    process.env.EMAIL_DEV_INBOX = "test-inbox@example.com";
    const input = {
      to: "user@ex.fr",
      subject: "Sujet",
      html: "<p>hi</p>",
      text: "hi",
      replyTo: { email: "support@beta.gouv.fr", name: "Support" },
    };
    const result = applyEmailDevRedirect(input);
    expect(result.html).toBe(input.html);
    expect(result.text).toBe(input.text);
    expect(result.replyTo).toEqual(input.replyTo);
  });
});
