import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { trackEvent, upsertContact, type BrevoAttributes } from "./brevo-contacts.adapter";
import { isBrevoContactSyncEnabled, resolveBrevoContactEmail, type BrevoEventName } from "./brevo-contacts.config";
import { buildContactAttributes } from "./contact-mapping";

/**
 * Synchro de contact Brevo en flux (V0).
 *
 * Point d'entrée unique des hooks métier : upsert le contact (attributs + liste)
 * puis enregistre l'évènement. Entièrement best-effort — n'échoue jamais le flux
 * appelant (inscription, validation AMO, sync DS).
 */

interface EmitOptions {
  /** Attributs spécifiques à l'évènement, mergés par-dessus les attributs de base. */
  attributes?: BrevoAttributes;
  /** Propriétés de l'évènement (détail de la transition). */
  eventProperties?: Record<string, string | number | boolean>;
}

/**
 * Pousse le contact d'un parcours vers Brevo et enregistre `eventName`.
 * No-op silencieux si la synchro est désactivée (local) ou l'email non résoluble
 * (staging sans boîte de test) — voir `resolveBrevoContactEmail`.
 */
export async function emitBrevoEvent(
  parcoursId: string,
  eventName: BrevoEventName,
  options?: EmitOptions
): Promise<void> {
  try {
    if (!isBrevoContactSyncEnabled()) return;

    const parcours = await parcoursRepo.findById(parcoursId);
    if (!parcours) return;

    const user = await userRepo.findById(parcours.userId);
    if (!user) return;

    const email = resolveBrevoContactEmail(user);
    if (!email) return;

    const attributes = { ...buildContactAttributes(user, parcours, email), ...options?.attributes };

    await upsertContact(email, attributes);
    await trackEvent(email, eventName, options?.eventProperties);
  } catch (error) {
    // Best-effort : on ne propage jamais une erreur Brevo au flux métier.
    console.error(
      `[BREVO_CONTACTS] emitBrevoEvent(${eventName}) échec:`,
      error instanceof Error ? error.message : error
    );
  }
}
