import { entreprisesAmoRepo, allersVersRepository } from "@/shared/database/repositories";
import { resolveResponsableForParcours } from "@/features/backoffice/espace-agent/dossiers/services/responsable-resolver.service";
import { RESPONSABLE_TYPE } from "@/features/parcours/core/domain/services/responsable.service";
import { validateEmailsList } from "@/features/parcours/amo/utils/amo.utils";
import { BREVO_ATTRS } from "./brevo-contacts.config";
import type { BrevoAttributes } from "./brevo-contacts.adapter";

function put(attrs: BrevoAttributes, key: string, value: string | null | undefined): void {
  if (!value) return;
  attrs[key] = value;
}

interface ConseillerSource {
  type: "AMO" | "ALLERS_VERS";
  nom: string;
  email: string | null | undefined;
  telephone: string | null | undefined;
  horaires: string | null | undefined;
}

function buildAttrs(source: ConseillerSource): BrevoAttributes {
  const attrs: BrevoAttributes = {};
  put(attrs, BREVO_ATTRS.CONSEILLER_TYPE, source.type);
  put(attrs, BREVO_ATTRS.CONSEILLER_NOM, source.nom);
  put(attrs, BREVO_ATTRS.CONSEILLER_EMAIL, source.email);
  put(attrs, BREVO_ATTRS.CONSEILLER_TELEPHONE, source.telephone);
  put(attrs, BREVO_ATTRS.CONSEILLER_HORAIRES, source.horaires);
  return attrs;
}

/**
 * Attributs de contact à partir d'une AMO déjà en main (évite un aller-retour DB) —
 * utilisé juste après l'attribution d'un AMO à un demandeur (`selectAmoForUser`).
 */
export function buildConseillerAttributesFromAmo(amo: {
  nom: string;
  emails: string;
  telephone: string;
  horaires?: string | null;
}): BrevoAttributes {
  return buildAttrs({
    type: "AMO",
    nom: amo.nom,
    email: validateEmailsList(amo.emails)[0],
    telephone: amo.telephone,
    horaires: amo.horaires,
  });
}

/**
 * Résout le conseiller local (AMO ou Aller-vers) responsable du parcours et retourne
 * ses coordonnées comme attributs de contact Brevo. Objet vide si aucun conseiller
 * n'est encore résolvable à cet instant (ex: pas de simulation/territoire).
 *
 * Best-effort comme le reste du pipeline Brevo (cf. `emitBrevoEvent`) : une erreur de
 * résolution (DB, territoire incohérent...) ne doit jamais faire échouer le flux
 * métier appelant (connexion FranceConnect, migration de simulation...).
 */
export async function buildConseillerAttributes(parcoursId: string): Promise<BrevoAttributes> {
  try {
    const responsable = await resolveResponsableForParcours(parcoursId);
    if (!responsable) return {};

    if (responsable.type === RESPONSABLE_TYPE.AMO) {
      const amo = await entreprisesAmoRepo.findById(responsable.entrepriseId);
      if (!amo) return {};
      return buildConseillerAttributesFromAmo(amo);
    }

    if (responsable.type === RESPONSABLE_TYPE.AV) {
      if (!responsable.structureId) return {};
      const av = await allersVersRepository.findById(responsable.structureId);
      if (!av) return {};
      return buildAttrs({
        type: "ALLERS_VERS",
        nom: av.nom,
        email: av.emails[0],
        telephone: av.telephone,
        horaires: av.horaires,
      });
    }

    return {};
  } catch (error) {
    console.error("[BREVO_CONTACTS] buildConseillerAttributes échec:", error instanceof Error ? error.message : error);
    return {};
  }
}
