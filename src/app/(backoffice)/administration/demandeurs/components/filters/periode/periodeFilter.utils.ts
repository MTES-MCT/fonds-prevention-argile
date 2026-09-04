import { UserWithParcoursDetails } from "@/features/backoffice";
import {
  PERIODES,
  SERVICE_START_DATE,
  type PeriodeId,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

/** Date de début pour une période donnée ("tout" et périodes inconnues → début du service). */
export function getDateDebutPeriode(periodeId: PeriodeId): Date {
  const periode = PERIODES.find((p) => p.id === periodeId);
  if (!periode || periode.jours === null) {
    return SERVICE_START_DATE;
  }
  const now = new Date();
  return new Date(now.getTime() - periode.jours * 24 * 60 * 60 * 1000);
}

/** Filtre les utilisateurs dont le parcours (ou le compte, à défaut) a été créé dans la période. */
export function filterUsersByPeriode(
  users: UserWithParcoursDetails[],
  periodeId: PeriodeId
): UserWithParcoursDetails[] {
  const dateDebut = getDateDebutPeriode(periodeId);
  return users.filter((u) => {
    const createdAt = u.parcours?.createdAt ?? u.user.createdAt;
    return createdAt >= dateDebut;
  });
}
