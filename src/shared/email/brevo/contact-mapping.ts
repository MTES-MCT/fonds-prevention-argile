import type { User } from "@/shared/database/schema/users";
import type { ParcoursPrevention } from "@/shared/database/schema/parcours-prevention";
import { BREVO_ATTRS } from "./brevo-contacts.config";
import type { BrevoAttributes } from "./brevo-contacts.adapter";
import { normalizeCodeInsee } from "@/features/parcours/amo/utils/amo.utils";
import { getEffectiveRGAData } from "@/features/parcours/core/services/rga-data.service";

/**
 * Ajoute une paire au dict d'attributs si la valeur est renseignée
 * (évite d'écraser un attribut Brevo existant avec une valeur vide).
 */
function put(attrs: BrevoAttributes, key: string, value: string | number | boolean | null | undefined): void {
  if (value === null || value === undefined || value === "") return;
  attrs[key] = value;
}

// Attributs Brevo depuis user + parcours ; `resolvedEmail` != vrai email (staging) -> EMAIL_REEL.
// N'inclut aucun attribut d'état AMO (A_AMO...) : posés par les hooks quand la valeur est connue,
// sinon un dn_update écraserait le A_AMO=true d'un amo_reponse. Voir docs/emails/BREVO-LIFECYCLE.md.
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
  put(attrs, BREVO_ATTRS.SOURCE_ACQUISITION, user.sourceAcquisition);

  // Données RGA effectives (agent prioritaire, cf. getEffectiveRGAData). JSONB peut stocker un
  // nombre : on renormalise l'INSEE sur 5 chiffres et on en dérive le département (2, 3 en outre-mer).
  const sim = getEffectiveRGAData(parcours);
  const insee = normalizeCodeInsee(sim?.logement?.commune);
  put(attrs, BREVO_ATTRS.INSEE, insee ?? undefined);
  put(
    attrs,
    BREVO_ATTRS.DEPARTEMENT,
    insee ? (/^9[78]/.test(insee) ? insee.slice(0, 3) : insee.slice(0, 2)) : undefined
  );

  const realEmail = user.emailContact ?? user.email;
  if (realEmail && realEmail !== resolvedEmail) {
    put(attrs, BREVO_ATTRS.EMAIL_REEL, realEmail);
  }

  return attrs;
}
