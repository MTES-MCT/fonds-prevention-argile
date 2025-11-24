import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/shared/config/env.config";
import { isValidBrevoPayload, processBrevoWebhook } from "@/features/parcours/amo/services/brevo-webhook.service";

/**
 * Webhook Brevo pour le tracking des emails AMO
 *
 * Route sécurisée par token dans l'URL : /api/webhooks/brevo/[token]
 * Le token doit correspondre à BREVO_WEBHOOK_SECRET
 *
 * Brevo envoie des événements : delivered, opened, click, soft_bounce, hard_bounce, etc.
 */

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * POST /api/webhooks/brevo/[token]
 */
export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { token } = await params;

    // Vérifier le token de sécurité
    const expectedToken = getServerEnv().BREVO_WEBHOOK_SECRET;

    if (!expectedToken) {
      console.error("[Brevo Webhook] BREVO_WEBHOOK_SECRET non configuré");
      // Retourner 200 pour éviter les retries Brevo
      return NextResponse.json({ success: false, error: "Configuration manquante" });
    }

    if (token !== expectedToken) {
      console.warn("[Brevo Webhook] Token invalide reçu");
      // Retourner 200 pour éviter les retries Brevo (mais on ne traite pas)
      return NextResponse.json({ success: false, error: "Token invalide" });
    }

    // Parser le payload
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      console.error("[Brevo Webhook] Payload JSON invalide");
      return NextResponse.json({ success: false, error: "Payload invalide" });
    }

    // Valider la structure du payload
    if (!isValidBrevoPayload(payload)) {
      console.error("[Brevo Webhook] Structure du payload invalide:", payload);
      return NextResponse.json({ success: false, error: "Structure invalide" });
    }

    // Traiter l'événement
    const result = await processBrevoWebhook(payload);

    if (result.updated) {
      console.log(`[Brevo Webhook] Événement ${result.event} traité pour messageId: ${result.messageId}`);
    }

    return NextResponse.json({
      success: true,
      event: result.event,
      updated: result.updated,
    });
  } catch (error) {
    // Logger l'erreur mais retourner 200 pour éviter les retries Brevo
    console.error("[Brevo Webhook] Erreur inattendue:", error);

    return NextResponse.json({
      success: false,
      error: "Erreur interne",
    });
  }
}

/**
 * GET /api/webhooks/brevo/[token]
 * Pour vérifier que la route est accessible (health check)
 */
export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { token } = await params;
  const expectedToken = getServerEnv().BREVO_WEBHOOK_SECRET;

  if (token !== expectedToken) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    webhook: "brevo",
    timestamp: new Date().toISOString(),
  });
}
