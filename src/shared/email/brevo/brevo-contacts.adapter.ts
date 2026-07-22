import { BrevoClient } from "@getbrevo/brevo";
import { createDebugLogger } from "@/shared/utils/debug.utils";
import { getBrevoContactListId, isBrevoContactSyncEnabled } from "./brevo-contacts.config";

/**
 * Adapter bas niveau vers l'API Brevo Contacts + Events.
 * Toutes les méthodes sont best-effort : elles loggent et renvoient un booléen,
 * ne jettent jamais (un échec Brevo ne doit pas casser le flux métier appelant).
 */

const debug = createDebugLogger("BREVO_CONTACTS");

export type BrevoAttributes = Record<string, string | number | boolean>;

let _client: BrevoClient | undefined;

function getClient(): BrevoClient | null {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;
  if (!_client) {
    _client = new BrevoClient({ apiKey });
  }
  return _client;
}

/**
 * Crée ou met à jour un contact (attributs) et l'ajoute à la liste cycle de vie.
 * `updateEnabled: true` -> upsert (pas d'erreur si le contact existe déjà).
 */
export async function upsertContact(email: string, attributes: BrevoAttributes): Promise<boolean> {
  if (!isBrevoContactSyncEnabled()) return false;
  const client = getClient();
  const listId = getBrevoContactListId();
  if (!client || listId === undefined) return false;

  try {
    await client.contacts.createContact({
      email,
      attributes,
      listIds: [listId],
      updateEnabled: true,
    });
    return true;
  } catch (error) {
    console.error("[BREVO_CONTACTS] upsertContact échec:", error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Enregistre un évènement Brevo (déclencheur d'Automation).
 * `event_properties` porte le détail de la transition métier.
 */
export async function trackEvent(
  email: string,
  eventName: string,
  eventProperties?: Record<string, string | number | boolean>
): Promise<boolean> {
  if (!isBrevoContactSyncEnabled()) return false;
  const client = getClient();
  if (!client) return false;

  try {
    await client.event.createEvent({
      event_name: eventName,
      identifiers: { email_id: email },
      ...(eventProperties ? { event_properties: eventProperties } : {}),
    });
    debug.log("event envoyé", { eventName });
    return true;
  } catch (error) {
    console.error(`[BREVO_CONTACTS] trackEvent(${eventName}) échec:`, error instanceof Error ? error.message : error);
    return false;
  }
}
