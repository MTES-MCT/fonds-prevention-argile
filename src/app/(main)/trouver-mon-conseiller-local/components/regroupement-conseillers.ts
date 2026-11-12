import { toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { isDepartementEligible } from "@/shared/constants/rga.constants";

export const LIBELLE_AUTRES_LOCALISATIONS = "Pour toute autre localisation";

export interface GroupeZone<T> {
  // Null : le département n'a pas de zone, ses Aller-vers s'affichent sans sous-titre.
  libelle: string | null;
  conseillers: T[];
}

/** Dans un département : un groupe par zone affichée, puis les Aller-vers sans zone. */
export function regrouperParZone<T extends { libelleZone?: string | null }>(conseillers: T[]): GroupeZone<T>[] {
  const zones = new Map<string, T[]>();
  const sansZone: T[] = [];
  for (const conseiller of conseillers) {
    const zone = conseiller.libelleZone?.trim();
    if (zone) zones.set(zone, [...(zones.get(zone) ?? []), conseiller]);
    else sansZone.push(conseiller);
  }
  if (zones.size === 0) return [{ libelle: null, conseillers: sansZone }];

  const groupes = [...zones].map(([libelle, liste]) => ({ libelle, conseillers: liste }));
  return sansZone.length > 0 ? [...groupes, { libelle: LIBELLE_AUTRES_LOCALISATIONS, conseillers: sansZone }] : groupes;
}

/** Départements où chercher un Aller-vers : ceux qu'il déclare, plus ceux de ses EPCI, parmi ceux du dispositif. */
export function departementsDuConseiller(
  declares: string[],
  epcis: string[],
  departementsDeLEpci: (codeEpci: string) => string[]
): string[] {
  // Un EPCI à cheval sur deux départements ramène aussi celui qui est hors dispositif.
  const codes = [...declares, ...epcis.flatMap(departementsDeLEpci)]
    .map(toOfficialCodeDepartement)
    .filter(isDepartementEligible);
  return [...new Set(codes)];
}
