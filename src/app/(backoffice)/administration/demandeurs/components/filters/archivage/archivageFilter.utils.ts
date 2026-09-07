import { UserWithParcoursDetails } from "@/features/backoffice";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { getDateDebutPeriode } from "../periode/periodeFilter.utils";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

/**
 * Un dossier archivé (arrêt d'accompagnement, refus, inéligibilité...) ne doit pas fausser
 * les compteurs "par étape" : il n'avance plus mais reste au dernier `currentStep` atteint.
 */
export function isUserArchive(user: UserWithParcoursDetails): boolean {
  return user.parcours?.situationParticulier === SituationParticulier.ARCHIVE;
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
  return users.filter((u) => {
    const archivedAt = u.parcours?.archivedAt;
    return archivedAt != null && archivedAt >= dateDebut;
  });
}
