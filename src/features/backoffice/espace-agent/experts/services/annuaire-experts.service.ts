import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import {
  annuaireDuDepartement,
  codeDepartementConnu,
  departementAffiche,
  DEPARTEMENTS_OFFICIELS,
  peutConsulterDepartement,
  perimetreExperts,
  type ExpertAnnuaire,
  type PerimetreExperts,
} from "@/features/backoffice/administration/experts";
import { expertsRepository } from "@/shared/database/repositories/experts.repository";
import { getDepartementName } from "@/shared/constants/departements.constants";
import type { AgentAvecRole } from "@/shared/database/schema/agents";
import type { UserRole } from "@/shared/domain/value-objects";

export interface AnnuaireExpertsAgent {
  departement: { code: string; nom: string } | null;
  departementsConsultables: readonly { code: string; nom: string }[];
  departementsDuTerritoire: string[];
  experts: ExpertAnnuaire[];
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

/** Annuaire d'un département, le territoire de l'agent par défaut ; l'analyste ne sort pas du sien. */
export async function chargerAnnuaireExperts(
  agent: AgentAvecRole,
  departementDemande: string | null | undefined
): Promise<AnnuaireExpertsAgent> {
  const perimetre = await perimetreDe(agent);
  const code = departementAffiche(perimetre, departementDemande);
  const experts = code ? annuaireDuDepartement(await expertsRepository.findActifsDuDepartement(code), code) : [];

  return {
    departement: code ? { code, nom: getDepartementName(code) } : null,
    departementsConsultables:
      perimetre.type === "tous"
        ? DEPARTEMENTS_OFFICIELS
        : perimetre.type === "territoire"
          ? perimetre.departements.map((d) => ({ code: d, nom: getDepartementName(d) }))
          : [],
    departementsDuTerritoire:
      perimetre.type === "tous"
        ? perimetre.departementsParDefaut
        : perimetre.type === "territoire"
          ? perimetre.departements
          : [],
    experts,
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
