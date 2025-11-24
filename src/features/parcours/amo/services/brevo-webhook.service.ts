import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations } from "@/shared/database/schema";
import {
  BrevoWebhookPayload,
  BrevoWebhookEvent,
  WebhookProcessingResult,
  TRACKED_EVENTS,
  EmailBounceType,
} from "@/shared/domain/types/brevo-webhook.types";

/**
 * Service de traitement des webhooks Brevo
 */

/**
 * Vérifie si l'événement doit être traité
 */
export function isTrackedEvent(event: BrevoWebhookEvent): boolean {
  return TRACKED_EVENTS.includes(event);
}

/**
 * Traite un événement webhook Brevo
 */
export async function processBrevoWebhook(payload: BrevoWebhookPayload): Promise<WebhookProcessingResult> {
  const { event, "message-id": messageId } = payload;

  // Vérifier si c'est un événement qu'on suit
  if (!isTrackedEvent(event)) {
    return {
      success: true,
      event,
      messageId,
      updated: false,
      error: "Événement non suivi",
    };
  }

  // Chercher la validation AMO par messageId
  const [validation] = await db
    .select({ id: parcoursAmoValidations.id })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.brevoMessageId, messageId))
    .limit(1);

  if (!validation) {
    return {
      success: true,
      event,
      messageId,
      updated: false,
      error: "Validation AMO non trouvée pour ce messageId",
    };
  }

  // Traiter selon le type d'événement
  const updateResult = await updateValidationFromEvent(validation.id, event, payload);

  return {
    success: true,
    event,
    messageId,
    updated: updateResult,
  };
}

/**
 * Met à jour la validation AMO selon l'événement
 */
async function updateValidationFromEvent(
  validationId: string,
  event: BrevoWebhookEvent,
  payload: BrevoWebhookPayload
): Promise<boolean> {
  const now = new Date();

  switch (event) {
    case "delivered":
      await db
        .update(parcoursAmoValidations)
        .set({ emailDeliveredAt: now })
        .where(eq(parcoursAmoValidations.id, validationId));
      return true;

    case "opened":
    case "unique_opened":
      // Mettre à jour seulement si pas encore ouvert (première ouverture)
      await db
        .update(parcoursAmoValidations)
        .set({ emailOpenedAt: now })
        .where(and(eq(parcoursAmoValidations.id, validationId), isNull(parcoursAmoValidations.emailOpenedAt)));
      return true;

    case "click":
      // Mettre à jour seulement si pas encore cliqué (premier clic)
      await db
        .update(parcoursAmoValidations)
        .set({ emailClickedAt: now })
        .where(and(eq(parcoursAmoValidations.id, validationId), isNull(parcoursAmoValidations.emailClickedAt)));
      return true;

    case "soft_bounce":
      await updateBounce(validationId, "soft", payload.reason);
      return true;

    case "hard_bounce":
      await updateBounce(validationId, "hard", payload.reason);
      return true;

    default:
      return false;
  }
}

/**
 * Met à jour les informations de bounce
 */
async function updateBounce(validationId: string, bounceType: EmailBounceType, reason?: string): Promise<void> {
  await db
    .update(parcoursAmoValidations)
    .set({
      emailBounceType: bounceType,
      emailBounceReason: reason || null,
    })
    .where(eq(parcoursAmoValidations.id, validationId));
}

/**
 * Valide la structure du payload Brevo
 */
export function isValidBrevoPayload(payload: unknown): payload is BrevoWebhookPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const p = payload as Record<string, unknown>;

  return typeof p.event === "string" && typeof p.email === "string" && typeof p["message-id"] === "string";
}
