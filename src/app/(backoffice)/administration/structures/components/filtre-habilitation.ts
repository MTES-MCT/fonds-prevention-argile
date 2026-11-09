import { LIBELLES_HABILITATION, TYPES_HABILITATION, type CritereHabilitation } from "@/features/backoffice";

export const PARAMETRE_HABILITATION = "habilitation";

export const CRITERES_HABILITATION: readonly { critere: CritereHabilitation; libelle: string }[] =
  TYPES_HABILITATION.map((type) => ({ critere: type, libelle: LIBELLES_HABILITATION[type] }));

// Les anciennes pages AMO, Aller-vers et Experts redirigent ici avec leur habilitation en paramètre.
export function lireCriteresHabilitation(valeur: string | string[] | null | undefined): CritereHabilitation[] {
  const valeurs = new Set(
    (Array.isArray(valeur) ? valeur : [valeur ?? ""]).flatMap((brute) => brute.split(",").map((v) => v.trim()))
  );
  return CRITERES_HABILITATION.map(({ critere }) => critere).filter((critere) => valeurs.has(critere));
}

export function ecrireCriteresHabilitation(criteres: CritereHabilitation[]): string | null {
  return criteres.length > 0 ? criteres.join(",") : null;
}
