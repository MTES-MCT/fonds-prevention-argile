/**
 * Types pour les webhooks Brevo (transactional emails)
 * Documentation : https://developers.brevo.com/docs/transactional-webhooks
 */

/**
 * Événements webhook supportés pour les emails transactionnels
 */
export type BrevoWebhookEvent =
  | "delivered"
  | "soft_bounce"
  | "hard_bounce"
  | "complaint"
  | "unique_opened"
  | "opened"
  | "click"
  | "invalid_email"
  | "deferred"
  | "blocked"
  | "unsubscribed"
  | "error";

/**
 * Payload envoyé par Brevo lors d'un événement webhook
 */
export interface BrevoWebhookPayload {
  /** Type d'événement */
  event: BrevoWebhookEvent;

  /** Adresse email du destinataire */
  email: string;

  /** ID unique du message Brevo */
  "message-id": string;

  /** Timestamp de l'événement (Unix timestamp) */
  ts_event: number;

  /** Sujet de l'email */
  subject?: string;

  /** Tag associé à l'email (si défini lors de l'envoi) */
  tag?: string;

  /** Raison du bounce (si événement bounce) */
  reason?: string;

  /** Code d'erreur (si événement d'erreur) */
  error_code?: string;

  /** URL cliquée (si événement click) */
  link?: string;

  /** Adresse IP du destinataire (si événement opened/click) */
  ip?: string;

  /** Timestamp d'envoi (Unix timestamp) */
  ts_sent?: number;

  /** Timestamp d'époque (Unix timestamp) */
  ts?: number;
}

/**
 * Événements qu'on traite pour le tracking email
 */
export const TRACKED_EVENTS: BrevoWebhookEvent[] = [
  "delivered",
  "soft_bounce",
  "hard_bounce",
  "unique_opened",
  "opened",
  "click",
];

/**
 * Type de bounce
 */
export type EmailBounceType = "hard" | "soft";

/**
 * Résultat du traitement d'un webhook
 */
export interface WebhookProcessingResult {
  success: boolean;
  event: BrevoWebhookEvent;
  messageId: string;
  updated: boolean;
  error?: string;
}
