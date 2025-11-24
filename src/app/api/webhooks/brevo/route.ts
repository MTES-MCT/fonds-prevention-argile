import { NextRequest, NextResponse } from "next/server";
import { getServerEnv } from "@/shared/config/env.config";
import {
  processBrevoWebhook,
  isValidBrevoPayload,
} from "@/features/amo-validation/services/brevo-webhook.service";

/**
 * Webhook Brevo pour le tracking des emails AMO
 *
 * Route sécurisée par token Bearer dans le header Authorization
 * Header attendu : Authorization: Bearer {BREVO_WEBHOOK_SECRET}
 *
 * Brevo envoie des événements : delivered, opened, click, soft_bounce, hard_bounce, etc.
 */

/**
 * Vérifie le token d'authentification Bearer
 */
function verifyBearerToken(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return false;
  }

  // Format attendu : "Bearer {token}"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return false;
  }

  const token = parts[1];
  const expectedToken = getServerEnv().BREVO_WEBHOOK_SECRET;

  if (!expectedToken) {
    console.error("[Brevo Webhook] BREVO_WEBHOOK_SECRET non configuré");
    return false;
  }

  return token === expectedToken;
}

/**
 * POST /api/webhooks/brevo
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Vérifier l'authentification Bearer
    if (!verifyBearerToken(request)) {
      console.warn("[Brevo Webhook] Authentification invalide");
      // Retourner 200 pour éviter les retries Brevo (mais on ne traite pas)
      return NextResponse.json({ success: false, error: "Authentification invalide" });
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
      console.log(
        `[Brevo Webhook] Événement ${result.event} traité pour messageId: ${result.messageId}`
      );
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
 * GET /api/webhooks/brevo
 * Pour vérifier que la route est accessible (health check)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyBearerToken(request)) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    status: "ok",
    webhook: "brevo",
    timestamp: new Date().toISOString(),
  });
}
