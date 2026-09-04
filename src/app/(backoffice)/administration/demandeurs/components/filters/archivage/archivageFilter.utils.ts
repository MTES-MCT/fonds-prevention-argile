import { UserWithParcoursDetails } from "@/features/backoffice";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";

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
