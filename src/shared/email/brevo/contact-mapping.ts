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

/**
 * Construit les attributs de contact Brevo depuis l'état courant user + parcours.
 *
 * `resolvedEmail` = email réellement poussé comme identité du contact ; s'il diffère
 * du vrai email (cas staging sous-adressé), on stocke le vrai dans EMAIL_REEL (debug).
 *
 * Les attributs AMO (`A_AMO`, `AMO_STATUT`, `EST_MANDATAIRE`) et `DS_STATUT` ne sont
 * pas dérivés ici (coûteux en requêtes) : les hooks qui en ont le contexte les
 * passent en override. `A_AMO` par défaut `false` (nouveau demandeur sans AMO).
 */
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
