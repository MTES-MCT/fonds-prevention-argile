import { allersVersRepository } from "@/shared/database";
import { resolveResponsableForParcours } from "@/features/backoffice/espace-agent/dossiers/services/responsable-resolver.service";
import { RESPONSABLE_TYPE, type Responsable } from "@/features/parcours/core/domain/services/responsable.service";

/**
 * Contexte minimal de l'agent connecté pour évaluer s'il agit en tant que
 * responsable d'un dossier.
 */
export interface ActorContext {
  entrepriseAmoId: string | null;
  allersVersId: string | null;
  /** Codes département couverts par la structure Aller-vers de l'agent. */
  allersVersDepartements: string[];
}

/**
 * `true` si l'agent peut agir au titre du responsable courant du dossier
 * (archiver, qualifier l'éligibilité). Comparaison au niveau de la structure
 * (entreprise AMO ou Aller-vers) — tous les agents d'une structure peuvent agir.
 */
export function canActAsResponsable(actor: ActorContext, responsable: Responsable): boolean {
  switch (responsable.type) {
    case RESPONSABLE_TYPE.AMO:
      return actor.entrepriseAmoId !== null && actor.entrepriseAmoId === responsable.entrepriseId;
    case RESPONSABLE_TYPE.AV:
      if (actor.allersVersId && responsable.structureId && actor.allersVersId === responsable.structureId) {
        return true;
      }
      return (
        responsable.codeDepartement !== null && actor.allersVersDepartements.includes(responsable.codeDepartement)
      );
    case RESPONSABLE_TYPE.MENAGE:
    case RESPONSABLE_TYPE.DDT:
    case RESPONSABLE_TYPE.ARCHIVE:
      return false;
  }
}

/**
 * Charge le contexte « actor » d'un agent : son id AMO/AV et la liste des
 * départements couverts par sa structure Aller-vers.
 */
export async function getActorContext(agent: {
  entrepriseAmoId: string | null;
  allersVersId: string | null;
}): Promise<ActorContext> {
  const allersVersDepartements = agent.allersVersId
    ? await allersVersRepository.getDepartementsByAllersVersId(agent.allersVersId)
    : [];

  return {
    entrepriseAmoId: agent.entrepriseAmoId,
    allersVersId: agent.allersVersId,
    allersVersDepartements,
  };
}

/**
 * Garde de server action : résout le responsable du parcours puis vérifie
 * que l'agent peut agir en son nom (archivage, qualification).
 */
export async function assertCanActAsResponsable(
  parcoursId: string,
  agent: { entrepriseAmoId: string | null; allersVersId: string | null }
): Promise<{ ok: true; responsable: Responsable } | { ok: false; error: string }> {
  const responsable = await resolveResponsableForParcours(parcoursId);
  if (!responsable) return { ok: false, error: "Dossier introuvable" };

  const actor = await getActorContext(agent);
  if (!canActAsResponsable(actor, responsable)) {
    return { ok: false, error: "Action réservée au responsable du dossier" };
  }
  return { ok: true, responsable };
}
