import { roleDepuisStructure, type AgentRole, type HabilitationsStructure } from "@/shared/domain/value-objects";

/** Habilitations d'une structure : AMO et Aller-vers font les rôles, expert n'en donne aucun (ADR-0052). */
export interface HabilitationsAdministrables extends HabilitationsStructure {
  expert: boolean;
}

export type TypeHabilitation = keyof HabilitationsAdministrables;

export const TYPES_HABILITATION: readonly TypeHabilitation[] = ["amo", "allersVers", "expert"];

const TYPES_DONNANT_UN_ROLE: readonly TypeHabilitation[] = ["amo", "allersVers"];

export const LIBELLES_HABILITATION: Record<TypeHabilitation, string> = {
  amo: "AMO",
  allersVers: "Aller-vers",
  expert: "Expert",
};

/** Lignes d'habilitation d'une structure, telles que l'administration les reçoit. */
export interface LignesHabilitation {
  entrepriseAmo: { nom: string } | null;
  allersVers: { nom: string } | null;
  expert: { nom: string } | null;
}

export function habilitationsDeLignes(lignes: LignesHabilitation): HabilitationsAdministrables {
  return { amo: !!lignes.entrepriseAmo, allersVers: !!lignes.allersVers, expert: !!lignes.expert };
}

export function ligneDeType<L extends LignesHabilitation>(
  lignes: L,
  type: TypeHabilitation
): L[keyof LignesHabilitation] {
  if (type === "amo") return lignes.entrepriseAmo;
  if (type === "allersVers") return lignes.allersVers;
  return lignes.expert;
}

function nombreHabilitations(habilitations: HabilitationsAdministrables): number {
  return TYPES_HABILITATION.filter((type) => habilitations[type]).length;
}

/** Rôles que gagnent les agents de chaque structure quand la source rejoint la cible. */
export interface EffetFusion {
  roleFinal: AgentRole | null;
  gainsAgentsCible: TypeHabilitation[];
  gainsAgentsSource: TypeHabilitation[];
}

/** Refus d'une fusion de la source dans la cible, ou null si elle est possible. */
export function refusFusion(
  cible: { id: string; habilitations: HabilitationsAdministrables },
  source: { id: string; habilitations: HabilitationsAdministrables }
): string | null {
  if (cible.id === source.id) return "Une structure ne peut pas être fusionnée avec elle-même";
  for (const type of TYPES_HABILITATION) {
    if (cible.habilitations[type] && source.habilitations[type]) {
      return `Les deux structures ont déjà une habilitation ${LIBELLES_HABILITATION[type]}`;
    }
  }
  if (nombreHabilitations(cible.habilitations) + nombreHabilitations(source.habilitations) === 0) {
    return "Aucune des deux structures n'a d'habilitation";
  }
  return null;
}

export function effetFusion(cible: HabilitationsAdministrables, source: HabilitationsAdministrables): EffetFusion {
  const roleFinal = roleDepuisStructure({
    amo: cible.amo || source.amo,
    allersVers: cible.allersVers || source.allersVers,
  });
  const gains = (de: HabilitationsAdministrables, vers: HabilitationsAdministrables) =>
    TYPES_DONNANT_UN_ROLE.filter((type) => de[type] && !vers[type]);
  return { roleFinal, gainsAgentsCible: gains(source, cible), gainsAgentsSource: gains(cible, source) };
}

// Détacher la seule habilitation d'une structure ne la séparerait de rien.
export function refusDetachement(habilitations: HabilitationsAdministrables): string | null {
  return nombreHabilitations(habilitations) >= 2
    ? null
    : "Seule une structure qui a au moins deux habilitations peut en détacher une";
}

/** Rôle que gardent les agents de la structure une fois l'habilitation détachée, null s'ils n'en ont plus. */
export function roleApresDetachement(
  habilitations: HabilitationsAdministrables,
  type: TypeHabilitation
): AgentRole | null {
  return roleDepuisStructure({ ...habilitations, [type]: false });
}
