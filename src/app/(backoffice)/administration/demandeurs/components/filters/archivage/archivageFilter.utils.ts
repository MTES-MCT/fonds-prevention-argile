import type { UserWithParcoursDetails } from "@/features/backoffice";
import { getDateDebutPeriode } from "../periode/periodeFilter.utils";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

/**
 * Un dossier archivé (arrêt d'accompagnement, refus, inéligibilité...) ne doit pas fausser
 * les compteurs "par étape" : il n'avance plus mais reste au dernier `currentStep` atteint.
 * Prédicat aligné sur `archivedAt`, la source de vérité du SQL des stats et de `getDossierEtat`.
 */
export function isUserArchive(user: UserWithParcoursDetails): boolean {
  return user.parcours?.archivedAt != null;
}

export function excludeArchivedUsers(users: UserWithParcoursDetails[]): UserWithParcoursDetails[] {
  return users.filter((u) => !isUserArchive(u));
}

export function keepOnlyArchivedUsers(users: UserWithParcoursDetails[]): UserWithParcoursDetails[] {
  return users.filter(isUserArchive);
}

/**
 * Archivés *sur* la période, au sens de `countDemandesArchivees` : la fenêtre porte sur la date
 * d'archivage, pas de création — sinon le graphe sous-compte la table qu'il surplombe (un dossier
 * est archivé bien après sa création, médiane ~48 j).
 */
export function keepArchivedInPeriode(
  users: UserWithParcoursDetails[],
  periodeId: PeriodeId
): UserWithParcoursDetails[] {
  const dateDebut = getDateDebutPeriode(periodeId);
  return users.filter((u) => isUserArchive(u) && u.parcours!.archivedAt! >= dateDebut);
}
