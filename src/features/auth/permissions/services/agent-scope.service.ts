import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { agentPermissionsRepository, allersVersRepository, entreprisesAmoRepo } from "@/shared/database";
import {
  matchesTerritoire,
  parcoursPreventionRepository,
} from "@/shared/database/repositories/parcours-prevention.repository";
import { getDemandeurFirstSimulation, type ParcoursSimulationPair } from "@/shared/domain/utils/rga-simulation.utils";
import type { AgentScope, AgentScopeInput, DossierAccessCheck, ScopeFilters } from "../domain/types/agent-scope.types";

/**
 * Calcule le scope de données d'un agent en fonction de son rôle et ses permissions
 */
export async function calculateAgentScope(agent: AgentScopeInput): Promise<AgentScope> {
  const { role, entrepriseAmoId, allersVersId } = agent;

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

    case UserRole.AMO: {
      // Les AMO récupèrent leurs départements/EPCI via leur entreprise rattachée.
      const [departementsAmo, epcisAmo] = entrepriseAmoId
        ? await Promise.all([
            entreprisesAmoRepo.getDepartementsByEntrepriseAmoId(entrepriseAmoId),
            entreprisesAmoRepo.getEpcisByEntrepriseAmoId(entrepriseAmoId),
          ])
        : [[], []];

      return {
        isNational: false,
        entrepriseAmoIds: entrepriseAmoId ? [entrepriseAmoId] : [],
        departements: departementsAmo,
        epcis: epcisAmo,
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: true,
        canViewDossiersWithoutAmo: false,
      };
    }

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

    case UserRole.ALLERS_VERS: {
      // Les Allers-Vers voient uniquement les dossiers sans AMO de leur territoire
      if (!allersVersId) {
        throw new Error("allersVersId is required for ALLERS_VERS role");
      }

      const departements = await allersVersRepository.getDepartementsByAllersVersId(allersVersId);
      const epcis = await allersVersRepository.getEpcisByAllersVersId(allersVersId);

      return {
        isNational: false,
        entrepriseAmoIds: [],
        departements,
        epcis,
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: false,
        canViewDossiersWithoutAmo: true, // Uniquement les prospects sans AMO
      };
    }

    case UserRole.AMO_ET_ALLERS_VERS: {
      // Rôle double : on agrège les territoires AV + AMO (union).
      if (!entrepriseAmoId || !allersVersId) {
        throw new Error("Both entrepriseAmoId and allersVersId are required for AMO_ET_ALLERS_VERS role");
      }

      const [deptsAv, epcisAv, deptsAmo, epcisAmo] = await Promise.all([
        allersVersRepository.getDepartementsByAllersVersId(allersVersId),
        allersVersRepository.getEpcisByAllersVersId(allersVersId),
        entreprisesAmoRepo.getDepartementsByEntrepriseAmoId(entrepriseAmoId),
        entreprisesAmoRepo.getEpcisByEntrepriseAmoId(entrepriseAmoId),
      ]);

      return {
        isNational: false,
        entrepriseAmoIds: [entrepriseAmoId],
        departements: Array.from(new Set([...deptsAv, ...deptsAmo])),
        epcis: Array.from(new Set([...epcisAv, ...epcisAmo])),
        canViewAllDossiers: false,
        canViewDossiersByEntreprise: true, // Peut voir les dossiers AMO
        canViewDossiersWithoutAmo: true, // Peut aussi voir les prospects sans AMO
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
 * Autorise la ré-ouverture d'une demande refusée par l'AMO.
 *
 * Volontairement PLUS LARGE que `canAccessDossier` : une demande refusée porte
 * l'entreprise AMO qui l'a refusée, donc un Aller-vers ne la « voit » normalement
 * pas dans son listing. On l'autorise tout de même à ré-ouvrir un dossier de SON
 * territoire (décision produit). Périmètre : AMO de l'entreprise rattachée, OU AV
 * couvrant le territoire, OU accès national (super-admin). Cf. ADR-0016.
 */
export function canReopenRefusedDemande(
  scope: AgentScope,
  dossier: { entrepriseAmoId: string | null; parcours: ParcoursSimulationPair }
): boolean {
  if (scope.canViewAllDossiers) {
    return true;
  }

  const amoMatch =
    scope.canViewDossiersByEntreprise &&
    !!dossier.entrepriseAmoId &&
    scope.entrepriseAmoIds.includes(dossier.entrepriseAmoId);

  const hasTerritoire = scope.departements.length > 0 || scope.epcis.length > 0;
  const avTerritoryMatch =
    scope.canViewDossiersWithoutAmo &&
    hasTerritoire &&
    matchesTerritoire(getDemandeurFirstSimulation(dossier.parcours), scope.departements, scope.epcis);

  return amoMatch || avTerritoryMatch;
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

  // Allers-vers : filtrer par territoire
  if (scope.canViewDossiersWithoutAmo) {
    return {
      departements: scope.departements.length > 0 ? scope.departements : undefined,
    };
  }

  // Analyste départemental (suivi DDT) : restreint à ses départements.
  if (scope.departements.length > 0) {
    return { departements: scope.departements };
  }

  // Analyste national : pas de département → stats nationales, aucun filtre.
  if (scope.isNational) {
    return null;
  }

  // Aucun périmètre exploitable (ex. AMO sans entreprise) : aucun résultat.
  return { noAccess: true };
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
 * Verifie qu'un prospect (parcours) est dans le territoire d'un agent Allers-Vers.
 * Retourne null si l'acces est autorise, ou un message d'erreur sinon.
 */
export async function verifyProspectTerritoryAccess(
  parcoursId: string,
  agent: AgentScopeInput
): Promise<string | null> {
  const scope = await calculateAgentScope(agent);

  // Accès national aux dossiers (admins) = court-circuit. On se base sur
  // canViewAllDossiers et non isNational : un analyste national voit les stats
  // nationales mais ne doit pas accéder au détail d'un dossier hors territoire.
  if (scope.canViewAllDossiers) {
    return null;
  }

  const parcours = await parcoursPreventionRepository.findById(parcoursId);
  if (!parcours) {
    return "Parcours non trouvé";
  }

  // Un agent sans périmètre territorial (ni département ni EPCI) ne voit aucun
  // prospect — cohérent avec le listing qui renvoie une liste vide dans ce cas.
  const hasFiltreTerritorial = scope.departements.length > 0 || scope.epcis.length > 0;
  if (!hasFiltreTerritorial) {
    return "Ce prospect n'est pas dans votre territoire";
  }

  // Aligné sur le listing (`getParcoursByTerritoire` → `matchesTerritoire`) :
  // même résolution USER-first (`getDemandeurFirstSimulation`) et même prédicat
  // union département ∪ EPCI. Avant, ce contrôle lisait `getEffectiveRGAData`
  // (AGENT-first), d'où l'incohérence « dossier visible en liste mais 404 au
  // détail » quand la simulation du demandeur et celle de l'agent divergeaient.
  const inTerritoire = matchesTerritoire(getDemandeurFirstSimulation(parcours), scope.departements, scope.epcis);

  return inTerritoire ? null : "Ce prospect n'est pas dans votre territoire";
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
    allersVersId: user.allersVersId ?? null,
  };

  const scope = await calculateAgentScope(agentInput);

  return getScopeFilterConditions(scope);
}

/**
 * Rôles habilités aux STATISTIQUES nationales (agrégats non nominatifs).
 * Distinct du scope DOSSIERS (territorial / par entreprise) : un agent AMO ou
 * Allers-Vers garde son périmètre de dossiers mais consulte les stats à l'échelle
 * nationale (ouverture des stats aux agents, cf. ADR-0017).
 */
export function canViewNationalStats(role: string): boolean {
  return (
    role === UserRole.SUPER_ADMINISTRATEUR ||
    role === UserRole.ADMINISTRATEUR ||
    role === UserRole.ANALYSTE ||
    role === UserRole.AMO ||
    role === UserRole.ALLERS_VERS ||
    role === UserRole.AMO_ET_ALLERS_VERS
  );
}

/**
 * Filtres de scope pour les surfaces de STATISTIQUES, distinct de
 * `getScopeFilters` (qui régit les dossiers). Règles :
 * - Analyste départemental (suivi DDT) : restreint à ses départements (ADR-0014).
 * - Autres rôles habilités (admins, analyste national, AMO, Allers-Vers,
 *   AMO+Allers-Vers) : national (aucun filtre).
 * - Rôle non habilité : aucun accès.
 *
 * Ne renvoie JAMAIS de filtre par entreprise AMO : les stats sont nationales,
 * jamais scopées à l'entreprise de l'agent (contrairement à ses dossiers).
 */
export async function getStatsScopeFilters(): Promise<ScopeFilters | null> {
  const user = await getCurrentUser();

  if (!user || !canViewNationalStats(user.role)) {
    return { noAccess: true };
  }

  // Seul l'analyste départemental reste territorial ; on lit directement ses
  // départements (les autres rôles habilités sont nationaux, sans dépendance à
  // l'entreprise / allers-vers).
  if (user.role === UserRole.ANALYSTE) {
    const departements = user.agentId ? await agentPermissionsRepository.getDepartementsByAgentId(user.agentId) : [];
    if (departements.length > 0) {
      return { departements };
    }
  }

  return null;
}
