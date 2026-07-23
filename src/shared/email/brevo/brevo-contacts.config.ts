import { assertEmailDevInboxSafety, getServerEnv, isLocal, isProduction } from "@/shared/config/env.config";
import type { User } from "@/shared/database/schema/users";

// Contrat app -> Brevo (attributs/évènements) : source de vérité, voir docs/emails/BREVO-LIFECYCLE.md.
// Les attributs doivent exister côté compte Brevo, sinon ignorés silencieusement.

// Attributs de contact (clés en MAJUSCULES, requis par l'API Brevo).
export const BREVO_ATTRS = {
  PRENOM: "PRENOM",
  NOM: "NOM",
  DATE_INSCRIPTION: "DATE_INSCRIPTION",
  SITUATION: "SITUATION",
  ETAPE: "ETAPE",
  STATUT: "STATUT",
  A_AMO: "A_AMO",
  AMO_STATUT: "AMO_STATUT",
  EST_MANDATAIRE: "EST_MANDATAIRE",
  DS_STATUT: "DS_STATUT",
  DEPARTEMENT: "DEPARTEMENT",
  INSEE: "INSEE",
  SOURCE_ACQUISITION: "SOURCE_ACQUISITION",
  // Debug staging uniquement : vrai email quand le contact est sous-adressé.
  EMAIL_REEL: "EMAIL_REEL",
} as const;

// Évènements poussés en flux. Servent de déclencheurs d'Automation côté Brevo.
export const BREVO_EVENTS = {
  DEMANDEUR_CREE: "demandeur_cree",
  SIMULATION_ENREGISTREE: "simulation_enregistree",
  AMO_REPONSE: "amo_reponse",
  DN_UPDATE: "dn_update",
} as const;

export type BrevoEventName = (typeof BREVO_EVENTS)[keyof typeof BREVO_EVENTS];

/** ID de la liste Brevo cible (undefined = non configurée -> synchro désactivée). */
export function getBrevoContactListId(): number | undefined {
  return getServerEnv().BREVO_CONTACT_LIST_ID;
}

/**
 * Vrai uniquement quand pousser un contact vers Brevo a du sens :
 * - jamais en local (pas de clé / Mailhog) ;
 * - une liste cible configurée.
 * La sécurité de l'email est gérée en plus par `resolveBrevoContactEmail`.
 */
export function isBrevoContactSyncEnabled(): boolean {
  if (isLocal() || !process.env.BREVO_API_KEY) return false;
  return getBrevoContactListId() !== undefined;
}

/**
 * Insère un tag `+u<id>` juste avant le `@` d'une adresse (sous-adressage).
 * Ex : marie@beta.gouv.fr + abc123 -> marie+uabc123@beta.gouv.fr.
 */
function toSubAddress(inbox: string, userId: string): string | null {
  const at = inbox.lastIndexOf("@");
  if (at <= 0) return null;
  const local = inbox.slice(0, at);
  const domain = inbox.slice(at + 1);
  return `${local}+u${userId}@${domain}`;
}

/**
 * Résout l'email du contact Brevo pour un user, selon l'environnement :
 * - local / pas de clé -> `null` (aucun push) ;
 * - production -> vrai email (`emailContact ?? email`) ;
 * - autre (staging) -> sous-adresse de `EMAIL_DEV_INBOX` (jamais le vrai email),
 *   `null` si aucune boîte de test n'est configurée (garde-fou anti-fuite).
 *
 * Garantie : hors production, aucun vrai email citoyen ne devient l'identité d'un
 * contact Brevo -> aucune Automation ne peut atteindre un citoyen.
 */
export function resolveBrevoContactEmail(user: Pick<User, "id" | "email" | "emailContact">): string | null {
  if (isLocal() || !process.env.BREVO_API_KEY) return null;

  if (isProduction()) {
    return user.emailContact ?? user.email ?? null;
  }

  const inbox = process.env.EMAIL_DEV_INBOX;
  if (!inbox) return null;
  // Revalide au point d'usage (domaine autorisé / interdit en prod) même si getServerEnv
  // l'a déjà fait au boot — défense en profondeur avant de sous-adresser.
  assertEmailDevInboxSafety(isProduction(), inbox);
  return toSubAddress(inbox, user.id);
}
