import { resolveResponsableForParcours } from "@/features/backoffice/espace-agent/dossiers/services/responsable-resolver.service";
import { RESPONSABLE_TYPE, type Responsable } from "@/features/parcours/core/domain/services/responsable.service";

/**
 * Contexte minimal de l'agent connecté pour évaluer s'il agit en tant que
 * responsable d'un dossier.
 */
export interface ActorContext {
  entrepriseAmoId: string | null;
  allersVersId: string | null;
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
      // Déclarer le département ne suffit pas : dans le 54, Alohé (Grand Nancy) agissait sur les dossiers de Soliha.
      return actor.allersVersId !== null && responsable.allersVersIds.includes(actor.allersVersId);
    case RESPONSABLE_TYPE.INDETERMINE:
      // Pas d'AV rattaché au territoire et pas d'AMO accompagnant : personne
      // ne peut agir au titre du responsable. Ne devrait pas arriver en prod.
      return false;
  }
}

/** Contexte « actor » d'un agent : son entreprise AMO et son Aller-vers. */
export function getActorContext(agent: { entrepriseAmoId: string | null; allersVersId: string | null }): ActorContext {
  return { entrepriseAmoId: agent.entrepriseAmoId, allersVersId: agent.allersVersId };
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

  const actor = getActorContext(agent);
  if (!canActAsResponsable(actor, responsable)) {
    return { ok: false, error: "Action réservée au responsable du dossier" };
  }
  return { ok: true, responsable };
}
