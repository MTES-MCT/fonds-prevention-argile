import type { User } from "@/shared/database/schema/users";
import type { ParcoursPrevention } from "@/shared/database/schema/parcours-prevention";
import { BREVO_ATTRS } from "./brevo-contacts.config";
import type { BrevoAttributes } from "./brevo-contacts.adapter";

/**
 * Ajoute une paire au dict d'attributs si la valeur est renseignée
 * (évite d'écraser un attribut Brevo existant avec une valeur vide).
 */
function put(attrs: BrevoAttributes, key: string, value: string | number | boolean | null | undefined): void {
  if (value === null || value === undefined || value === "") return;
  attrs[key] = value;
}

// Attributs Brevo depuis user + parcours ; `resolvedEmail` != vrai email (staging) -> EMAIL_REEL.
// Attributs AMO / DS_STATUT passés en override par les hooks. Voir docs/emails/BREVO-LIFECYCLE.md.
export function buildContactAttributes(
  user: User,
  parcours: ParcoursPrevention,
  resolvedEmail: string
): BrevoAttributes {
  const attrs: BrevoAttributes = {};

  put(attrs, BREVO_ATTRS.PRENOM, user.prenom);
  put(attrs, BREVO_ATTRS.NOM, user.nom);
  put(attrs, BREVO_ATTRS.DATE_INSCRIPTION, parcours.createdAt.toISOString().slice(0, 10));
  put(attrs, BREVO_ATTRS.SITUATION, parcours.situationParticulier);
  put(attrs, BREVO_ATTRS.ETAPE, parcours.currentStep);
  put(attrs, BREVO_ATTRS.STATUT, parcours.currentStatus);
  put(attrs, BREVO_ATTRS.A_AMO, false);
  put(attrs, BREVO_ATTRS.SOURCE_ACQUISITION, user.sourceAcquisition);

  const sim = parcours.rgaSimulationData ?? parcours.rgaSimulationDataAgent;
  put(attrs, BREVO_ATTRS.DEPARTEMENT, sim?.logement?.code_departement);
  put(attrs, BREVO_ATTRS.INSEE, sim?.logement?.commune);

  const realEmail = user.emailContact ?? user.email;
  if (realEmail && realEmail !== resolvedEmail) {
    put(attrs, BREVO_ATTRS.EMAIL_REEL, realEmail);
  }

  return attrs;
}
