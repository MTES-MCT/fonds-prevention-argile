import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import {
  annuaireDuDepartement,
  codeDepartementConnu,
  DEPARTEMENTS_OFFICIELS,
  departementsDeLaVue,
  peutConsulterDepartement,
  perimetreExperts,
  vueAffichee,
  type ExpertAnnuaire,
  type PerimetreExperts,
  type VueAnnuaire,
} from "@/features/backoffice/administration/experts";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { getDepartementName } from "@/shared/constants/departements.constants";
import type { AgentAvecRole } from "@/shared/database/schema/agents";
import type { UserRole } from "@/shared/domain/value-objects";

export interface SectionAnnuaire {
  code: string;
  nom: string;
  experts: ExpertAnnuaire[];
}

export interface AnnuaireExpertsAgent {
  vue: VueAnnuaire | null;
  // « territoire » pour l'analyste, borné à ses départements ; « tous » sinon.
  perimetre: PerimetreExperts["type"];
  sections: SectionAnnuaire[];
  departementsConsultables: readonly { code: string; nom: string; aDesExperts: boolean }[];
  departementsDuTerritoire: string[];
}

async function perimetreDe(agent: AgentAvecRole): Promise<PerimetreExperts> {
  if (!hasPermission(agent.role as UserRole, BackofficePermission.EXPERTS_READ)) return { type: "aucun" };
  const scope = await calculateAgentScope({
    id: agent.id,
    role: agent.role,
    entrepriseAmoId: agent.entrepriseAmoId,
    allersVersId: agent.allersVersId,
  });
  return perimetreExperts(agent.role, scope.departements);
}

/** Annuaire d'un département ou de plusieurs, regroupés ; le territoire de l'agent par défaut. */
export async function chargerAnnuaireExperts(
  agent: AgentAvecRole,
  vueDemandee: string | null | undefined
): Promise<AnnuaireExpertsAgent> {
  const perimetre = await perimetreDe(agent);
  const vue = vueAffichee(perimetre, vueDemandee);
  if (perimetre.type === "aucun" || !vue) {
    return {
      vue: null,
      perimetre: perimetre.type,
      sections: [],
      departementsConsultables: [],
      departementsDuTerritoire: [],
    };
  }

  // Une liste de quelques dizaines d'experts : un seul aller-retour sert la vue et les mentions « aucun expert ».
  const actifs = await expertsRepository.findActifs();
  const avecExperts = [...new Set(actifs.flatMap((expert) => expert.departements.map((d) => d.codeDepartement)))];
  const sections = departementsDeLaVue(perimetre, vue, avecExperts).map((code) => ({
    code,
    nom: getDepartementName(code),
    experts: annuaireDuDepartement(actifs, code),
  }));

  const consultables =
    perimetre.type === "tous"
      ? DEPARTEMENTS_OFFICIELS
      : perimetre.departements.map((code) => ({ code, nom: getDepartementName(code) }));

  return {
    vue,
    perimetre: perimetre.type,
    sections,
    departementsConsultables: consultables.map((d) => ({ ...d, aDesExperts: avecExperts.includes(d.code) })),
    departementsDuTerritoire: perimetre.type === "tous" ? perimetre.departementsParDefaut : perimetre.departements,
  };
}

/** Experts du département d'un dossier, que la page a déjà ouvert à l'agent. */
export async function expertsDuDepartementDuDossier(
  agent: AgentAvecRole,
  codeDepartement: string | null | undefined
): Promise<{ code: string; nom: string; experts: ExpertAnnuaire[] } | null> {
  const code = codeDepartement ? codeDepartementConnu(String(codeDepartement)) : null;
  if (!code) return null;
  const perimetre = await perimetreDe(agent);
  if (!peutConsulterDepartement(perimetre, code)) return null;
  return {
    code,
    nom: getDepartementName(code),
    experts: annuaireDuDepartement(await expertsRepository.findActifsDuDepartement(code), code),
  };
}
