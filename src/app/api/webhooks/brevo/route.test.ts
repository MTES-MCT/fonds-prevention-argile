import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const SECRET = "s3cr3t-de-trente-deux-caracteres-min";

vi.mock("@/shared/config/env.config", () => ({
  getServerEnv: () => ({ BREVO_WEBHOOK_SECRET: SECRET }),
}));
vi.mock("@/features/parcours/amo/services/brevo-webhook.service", () => ({
  isValidBrevoPayload: vi.fn(() => true),
  processBrevoWebhook: vi.fn(async () => ({ event: "delivered", updated: true, messageId: "m1" })),
}));

import { GET, POST } from "./route";
import { processBrevoWebhook } from "@/features/parcours/amo/services/brevo-webhook.service";

function requete(method: "GET" | "POST", authorization?: string) {
  return new NextRequest("http://localhost/api/webhooks/brevo", {
    method,
    headers: authorization ? { authorization } : {},
    body: method === "POST" ? JSON.stringify({ event: "delivered" }) : undefined,
  });
}

describe("webhook Brevo — authentification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bon token → événement traité", async () => {
    const res = await POST(requete("POST", `Bearer ${SECRET}`));

    expect(await res.json()).toMatchObject({ success: true });
    expect(processBrevoWebhook).toHaveBeenCalledOnce();
  });

  // 200 volontaire (évite les retries Brevo), mais rien n'est traité.
  it.each([undefined, "Bearer mauvais", `Basic ${SECRET}`])("token %s → rien n'est traité", async (auth) => {
    const res = await POST(requete("POST", auth));

    expect(await res.json()).toMatchObject({ success: false });
    expect(processBrevoWebhook).not.toHaveBeenCalled();
  });

  it("GET sans bon token → 401", async () => {
    expect((await GET(requete("GET", "Bearer mauvais"))).status).toBe(401);
  });
});
