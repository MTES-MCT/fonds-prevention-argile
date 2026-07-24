import { entreprisesAmoRepo, allersVersRepository } from "@/shared/database/repositories";
import { resolveResponsableForParcours } from "@/features/backoffice/espace-agent/dossiers/services/responsable-resolver.service";
import { RESPONSABLE_TYPE } from "@/features/parcours/core/domain/services/responsable.service";
import { validateEmailsList } from "@/features/parcours/amo/utils/amo.utils";

function put(props: Record<string, string>, key: string, value: string | null | undefined): void {
  if (!value) return;
  props[key] = value;
}

/**
 * Attributs du conseiller local (AMO ou Aller-vers) responsable du parcours, poussés en
 * `event_properties` de `demandeur_cree` pour personnaliser le mail de bienvenue Brevo.
 * Objet vide si aucun conseiller n'est encore résolvable (ex: pas de simulation/territoire).
 */
export async function buildConseillerEventProperties(parcoursId: string): Promise<Record<string, string>> {
  const responsable = await resolveResponsableForParcours(parcoursId);
  if (!responsable) return {};

  const props: Record<string, string> = {};

  if (responsable.type === RESPONSABLE_TYPE.AMO) {
    const amo = await entreprisesAmoRepo.findById(responsable.entrepriseId);
    if (!amo) return {};
    put(props, "conseiller_type", "AMO");
    put(props, "conseiller_nom", amo.nom);
    put(props, "conseiller_email", validateEmailsList(amo.emails)[0]);
    put(props, "conseiller_telephone", amo.telephone);
    put(props, "conseiller_horaires", amo.horaires);
    return props;
  }

  if (responsable.type === RESPONSABLE_TYPE.AV) {
    if (!responsable.structureId) return {};
    const av = await allersVersRepository.findById(responsable.structureId);
    if (!av) return {};
    put(props, "conseiller_type", "ALLERS_VERS");
    put(props, "conseiller_nom", av.nom);
    put(props, "conseiller_email", av.emails[0]);
    put(props, "conseiller_telephone", av.telephone);
    put(props, "conseiller_horaires", av.horaires);
    return props;
  }

  return {};
}
