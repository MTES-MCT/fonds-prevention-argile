import { parcoursRepo, userRepo } from "@/shared/database/repositories";
import { trackEvent, upsertContact, type BrevoAttributes } from "./brevo-contacts.adapter";
import { isBrevoContactSyncEnabled, resolveBrevoContactEmail, type BrevoEventName } from "./brevo-contacts.config";
import { buildContactAttributes } from "./contact-mapping";
import { createDebugLogger } from "@/shared/utils/debug.utils";
import { isProduction } from "@/shared/config/env.config";

// Point d'entrée unique des hooks Brevo (best-effort). Voir docs/emails/BREVO-LIFECYCLE.md.
// Trace détaillée du flux via DEBUG_BREVO_CONTACTS=true (erreurs toujours loggées).
const debug = createDebugLogger("BREVO_CONTACTS");

interface EmitOptions {
  // Attributs spécifiques à l'évènement, mergés par-dessus les attributs de base.
  attributes?: BrevoAttributes;
  // Propriétés de l'évènement (détail de la transition).
  eventProperties?: Record<string, string | number | boolean>;
}

// Masque le local-part hors staging pour ne pas logger de PII en production.
function maskEmail(email: string): string {
  if (!isProduction()) return email;
  const at = email.lastIndexOf("@");
  return at > 0 ? `***${email.slice(at)}` : "***";
}

// Upsert le contact + enregistre l'évènement. No-op si synchro désactivée ou email
// non résoluble (local / staging sans boîte de test), cf. resolveBrevoContactEmail.
export async function emitBrevoEvent(
  parcoursId: string,
  eventName: BrevoEventName,
  options?: EmitOptions
): Promise<void> {
  try {
    if (!isBrevoContactSyncEnabled()) {
      debug.log(`skip ${eventName}: synchro désactivée (liste non configurée ou local)`);
      return;
    }

    const parcours = await parcoursRepo.findById(parcoursId);
    if (!parcours) {
      debug.log(`skip ${eventName}: parcours introuvable`, { parcoursId });
      return;
    }

    const user = await userRepo.findById(parcours.userId);
    if (!user) {
      debug.log(`skip ${eventName}: user introuvable`, { parcoursId });
      return;
    }

    const email = resolveBrevoContactEmail(user);
    if (!email) {
      debug.log(`skip ${eventName}: email non résoluble (EMAIL_DEV_INBOX manquant en staging ?)`);
      return;
    }

    const attributes = { ...buildContactAttributes(user, parcours, email), ...options?.attributes };
    // Clés d'attributs seulement (pas les valeurs) pour éviter toute PII dans les logs.
    debug.log(`emit ${eventName}`, { email: maskEmail(email), attributs: Object.keys(attributes) });

    const upserted = await upsertContact(email, attributes);
    const tracked = await trackEvent(email, eventName, options?.eventProperties);
    debug.log(`emit ${eventName}: done`, { upserted, tracked });
  } catch (error) {
    // Best-effort : on ne propage jamais une erreur Brevo au flux métier.
    console.error(
      `[BREVO_CONTACTS] emitBrevoEvent(${eventName}) échec:`,
      error instanceof Error ? error.message : error
    );
  }
}
