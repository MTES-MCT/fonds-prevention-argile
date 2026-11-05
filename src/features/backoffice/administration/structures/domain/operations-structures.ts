import { roleDepuisStructure, type AgentRole, type HabilitationsStructure } from "@/shared/domain/value-objects";

export type TypeHabilitation = keyof HabilitationsStructure;

export const TYPES_HABILITATION: readonly TypeHabilitation[] = ["amo", "allersVers"];

export const LIBELLES_HABILITATION: Record<TypeHabilitation, string> = {
  amo: "AMO",
  allersVers: "Aller-vers",
};

/** Rôles que gagnent les agents de chaque structure quand la source rejoint la cible. */
export interface EffetFusion {
  roleFinal: AgentRole;
  gainsAgentsCible: TypeHabilitation[];
  gainsAgentsSource: TypeHabilitation[];
}

/** Refus d'une fusion de la source dans la cible, ou null si elle est possible. */
export function refusFusion(
  cible: { id: string; habilitations: HabilitationsStructure },
  source: { id: string; habilitations: HabilitationsStructure }
): string | null {
  if (cible.id === source.id) return "Une structure ne peut pas être fusionnée avec elle-même";
  for (const type of TYPES_HABILITATION) {
    if (cible.habilitations[type] && source.habilitations[type]) {
      return `Les deux structures ont déjà une habilitation ${LIBELLES_HABILITATION[type]}`;
    }
  }
  if (!effetFusion(cible.habilitations, source.habilitations)) {
    return "Aucune des deux structures n'a d'habilitation";
  }
  return null;
}

export function effetFusion(cible: HabilitationsStructure, source: HabilitationsStructure): EffetFusion | null {
  const roleFinal = roleDepuisStructure({
    amo: cible.amo || source.amo,
    allersVers: cible.allersVers || source.allersVers,
  });
  if (!roleFinal) return null;

  const gains = (de: HabilitationsStructure, vers: HabilitationsStructure) =>
    TYPES_HABILITATION.filter((type) => de[type] && !vers[type]);
  return { roleFinal, gainsAgentsCible: gains(source, cible), gainsAgentsSource: gains(cible, source) };
}

// Détacher la seule habilitation d'une structure ne la séparerait de rien.
export function refusDetachement(habilitations: HabilitationsStructure): string | null {
  return habilitations.amo && habilitations.allersVers
    ? null
    : "Seule une structure qui a les deux habilitations peut en détacher une";
}
