import { UserRole } from "@/shared/domain/value-objects";

/**
 * Rôles habilités à arrêter un accompagnement AMO (« Ne plus accompagner »).
 * Sert au gate d'affichage de l'entrée de menu (page) ET à la garde de la server action.
 * Le périmètre fin est vérifié en plus via `assertCanActAsResponsable` : seul le
 * responsable courant du dossier peut arrêter son propre accompagnement.
 */
export const ROLES_ARRET_ACCOMPAGNEMENT: string[] = [UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS];

/** Raisons proposées à l'AMO qui cesse d'accompagner (multi-sélection, cf. maquette). */
export const RAISONS_ARRET_ACCOMPAGNEMENT = [
  "Reste à charge trop élevé",
  "Le demandeur a abandonné le projet",
  "Le demandeur ne donne pas de réponse",
  "Fausse déclaration / document falsifié",
  "Autre",
] as const;

export type RaisonArretAccompagnement = (typeof RAISONS_ARRET_ACCOMPAGNEMENT)[number];

export const RAISON_ARRET_AUTRE = "Autre";
