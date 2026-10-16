import type { UserWithParcoursDetails } from "@/features/backoffice";
import { asString } from "@/shared/utils";

/** Code INSEE d'une commune ou d'un arrondissement municipal (Corse comprise). */
export const CODE_COMMUNE_REGEX = /^(\d{5}|2[AB]\d{3})$/;

export interface DemandeursCommune {
  code: string;
  nom: string;
  demandeurs: number;
}

/** Centres des communes, par code INSEE : `[longitude, latitude]`. */
export type CentresCommunes = Record<string, [number, number]>;

export interface ProprietesCommune {
  code: string;
  nom: string;
  demandeurs: number;
}

export interface CarteCommunes {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    geometry: { type: "Point"; coordinates: [number, number] };
    properties: ProprietesCommune;
  }[];
}

export function normaliserCodeCommune(valeur: unknown): string | null {
  const brut = asString(valeur)?.trim();
  if (!brut) return null;
  // Un JSONB peut porter le code en nombre, et perdre ainsi le zéro de tête (03185 → 3185).
  const code = /^\d{4}$/.test(brut) ? brut.padStart(5, "0") : brut.toUpperCase();
  return CODE_COMMUNE_REGEX.test(code) ? code : null;
}

export function codeDepartementDeCommune(code: string): string {
  return code.startsWith("97") || code.startsWith("98") ? code.slice(0, 3) : code.slice(0, 2);
}

/** Demandeurs par commune de leur logement ; ceux sans commune connue sont écartés. */
export function compterDemandeursParCommune(users: UserWithParcoursDetails[]): DemandeursCommune[] {
  const parCommune = new Map<string, DemandeursCommune>();

  for (const user of users) {
    const code = normaliserCodeCommune(user.rgaSimulation?.logement?.commune);
    if (!code) continue;
    const existante = parCommune.get(code);
    if (existante) {
      existante.demandeurs += 1;
    } else {
      parCommune.set(code, { code, nom: asString(user.rgaSimulation?.logement?.commune_nom) ?? code, demandeurs: 1 });
    }
  }

  return [...parCommune.values()].sort((a, b) => b.demandeurs - a.demandeurs || a.code.localeCompare(b.code));
}

/** Un point par commune, posé sur son centre ; une commune sans centre connu n'est pas affichée. */
export function construireCarteCommunes(communes: DemandeursCommune[], centres: CentresCommunes): CarteCommunes {
  return {
    type: "FeatureCollection",
    features: communes.flatMap((commune) => {
      const centre = centres[commune.code];
      if (!centre) return [];
      return [
        {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: centre },
          properties: { code: commune.code, nom: commune.nom, demandeurs: commune.demandeurs },
        },
      ];
    }),
  };
}

/** Une carte par département : chacune est regroupée à part, si bien qu'un groupe ne franchit jamais une limite départementale. */
export function repartirParDepartement(carte: CarteCommunes): Map<string, CarteCommunes> {
  const parDepartement = new Map<string, CarteCommunes>();
  for (const feature of carte.features) {
    const departement = codeDepartementDeCommune(feature.properties.code);
    const existante = parDepartement.get(departement);
    if (existante) {
      existante.features.push(feature);
    } else {
      parDepartement.set(departement, { type: "FeatureCollection", features: [feature] });
    }
  }
  return parDepartement;
}
