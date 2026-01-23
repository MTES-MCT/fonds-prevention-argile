import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { agentPermissionsRepository } from "@/shared/database";
import type { AgentScope, AgentScopeInput, DossierAccessCheck, ScopeFilters } from "../domain/types/agent-scope.types";

/**
 * Calcule le scope de données d'un agent en fonction de son rôle et ses permissions
 */
export async function calculateAgentScope(agent: AgentScopeInput): Promise<AgentScope> {
  const { role, entrepriseAmoId } = agent;

  // Construire le scope selon le rôle
  switch (role) {
    case UserRole.SUPER_ADMINISTRATEUR:
    case UserRole.ADMINISTRATEUR:
      // Les admins ont accès national, pas besoin de récupérer les départements
      return {
        isNational: true,
        entrepriseAmoIds: [],
        departements: [],
        epcis: [],
        canViewAllDossiers: true,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: true,
      };

    case UserRole.AMO:
      // Les AMO n'ont pas de départements assignés, juste leur entreprise
      return {
        isNational: false,
        entrepriseAmoIds: entrepriseAmoId ? [entrepriseAmoId] : [],
        departements: [],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: false,
      };

    case UserRole.ANALYSTE: {
      // Récupérer les départements assignés seulement si agentId est valide
      const departements = agent.id ? await agentPermissionsRepository.getDepartementsByAgentId(agent.id) : [];
      return {
        isNational: departements.length === 0, // Si pas de départements assignés = accès national pour stats
        entrepriseAmoIds: [],
        departements,
        epcis: [],
        canViewAllDossiers: false, // Les analystes n'ont pas accès aux dossiers individuels
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: false,
      };
    }

    default:
      // Rôle inconnu = aucun accès
      return {
        isNational: false,
        entrepriseAmoIds: [],
        departements: [],
        epcis: [],
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: false,
      };
  }
}

/**
 * Vérifie si un agent peut accéder à un dossier spécifique
 *
 * @param scope - Le scope de l'agent
 * @param dossier - Les informations du dossier à vérifier
 * @returns Le résultat de la vérification d'accès
 */
export function canAccessDossier(
  scope: AgentScope,
  dossier: {
    entrepriseAmoId: string | null;
    departementCode?: string;
    epciCode?: string;
  }
): DossierAccessCheck {
  // Accès national = accès à tout
  if (scope.canViewAllDossiers) {
    return { hasAccess: true };
  }

  // Vérification par entreprise AMO
  if (scope.canViewDossiersByEntreprise && dossier.entrepriseAmoId) {
    if (scope.entrepriseAmoIds.includes(dossier.entrepriseAmoId)) {
      return { hasAccess: true };
    }
    return {
      hasAccess: false,
      reason: "Ce dossier appartient à une autre entreprise AMO",
    };
  }

  // Vérification pour les dossiers sans AMO (allers-vers, phase future)
  if (scope.canViewDossiersWithoutAmo && !dossier.entrepriseAmoId) {
    // Vérifier le département
    if (scope.departements.length > 0 && dossier.departementCode) {
      if (scope.departements.includes(dossier.departementCode)) {
        return { hasAccess: true };
      }
    }

    // Vérifier l'EPCI
    if (scope.epcis.length > 0 && dossier.epciCode) {
      if (scope.epcis.includes(dossier.epciCode)) {
        return { hasAccess: true };
      }
    }

    return {
      hasAccess: false,
      reason: "Ce dossier est hors de votre territoire",
    };
  }

  // AMO essayant d'accéder à un dossier sans AMO
  if (scope.canViewDossiersByEntreprise && !dossier.entrepriseAmoId) {
    return {
      hasAccess: false,
      reason: "Ce dossier n'a pas encore sélectionné d'AMO",
    };
  }

  return {
    hasAccess: false,
    reason: "Accès non autorisé à ce dossier",
  };
}

/**
 * Vérifie si un agent peut voir les statistiques d'un territoire
 *
 * @param scope - Le scope de l'agent
 * @param departementCode - Code du département (optionnel)
 * @returns true si l'agent peut voir les stats de ce territoire
 */
export function canViewStatsForTerritory(scope: AgentScope, departementCode?: string): boolean {
  // Accès national = accès à toutes les stats
  if (scope.isNational) {
    return true;
  }

  // Pas de filtre département = stats globales, vérifier si autorisé
  if (!departementCode) {
    // Les analystes sans restriction de département peuvent voir les stats globales
    return scope.departements.length === 0;
  }

  // Vérifier si le département est dans le scope
  return scope.departements.includes(departementCode);
}

/**
 * Génère les conditions de filtrage pour les requêtes de données
 * Retourne null si accès national (pas de filtre nécessaire)
 *
 * @param scope - Le scope de l'agent
 * @returns Les conditions de filtrage ou null
 */
export function getScopeFilterConditions(scope: AgentScope): ScopeFilters | null {
  // Accès national = pas de filtre
  if (scope.canViewAllDossiers) {
    return null;
  }

  // AMO = filtrer par entreprise
  if (scope.canViewDossiersByEntreprise && scope.entrepriseAmoIds.length > 0) {
    return {
      entrepriseAmoIds: scope.entrepriseAmoIds,
    };
  }

  // Allers-vers (phase future) = filtrer par territoire + exclure ceux avec AMO
  if (scope.canViewDossiersWithoutAmo) {
    return {
      departements: scope.departements.length > 0 ? scope.departements : undefined,
      excludeWithAmo: true,
    };
  }

  // Analyste = pas d'accès aux dossiers individuels
  return {
    entrepriseAmoIds: [], // Filtre vide = aucun résultat
  };
}

/**
 * Vérifie si l'agent AMO a une entreprise rattachée
 * Utilisé pour bloquer l'accès si non configuré
 */
export function isAmoConfigured(agent: AgentScopeInput): boolean {
  if (agent.role !== UserRole.AMO) {
    return true; // Non applicable pour les autres rôles
  }
  return agent.entrepriseAmoId !== null;
}

/**
 * Récupère les filtres de scope pour l'utilisateur actuellement connecté
 * Fonction principale à utiliser dans les server actions
 *
 * @returns Les filtres à appliquer aux requêtes, ou null si accès national
 */
export async function getScopeFilters(): Promise<ScopeFilters | null> {
  const user = await getCurrentUser();

  if (!user) {
    return { noAccess: true };
  }

  const agentInput: AgentScopeInput = {
    id: user.agentId ?? "",
    role: user.role,
    entrepriseAmoId: user.entrepriseAmoId ?? null,
  };

  const scope = await calculateAgentScope(agentInput);

  return getScopeFilterConditions(scope);
}
