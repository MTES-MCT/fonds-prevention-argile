import { count, isNotNull, isNull, eq, and, inArray } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  users,
  parcoursAmoValidations,
  dossiersDemarchesSimplifiees,
  parcoursPrevention,
} from "@/shared/database/schema";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { getMatomoStatistiques } from "./matomo.service";
import { getFunnelSimulateurRGA } from "./matomo-funnel.service";
import type { Statistiques } from "../domain/types/statistiques.types";
import type { ScopeFilters } from "@/features/auth/permissions/domain/types/agent-scope.types";

/**
 * Récupère toutes les statistiques globales (DB + Matomo + Funnel)
 *
 * @param scopeFilters - Filtres optionnels selon le scope de l'agent
 *   - entrepriseAmoIds: Filtre par entreprises AMO (pour les agents AMO)
 *   - noAccess: Si true, retourne des stats à zéro
 */
export async function getStatistiques(scopeFilters?: ScopeFilters | null): Promise<Statistiques> {
  // Si noAccess, retourner des stats à zéro
  if (scopeFilters?.noAccess) {
    return getEmptyStatistiques();
  }

  // Déterminer si on a un filtre par entreprise (= vue restreinte AMO)
  const hasEntrepriseFilter = scopeFilters?.entrepriseAmoIds && scopeFilters.entrepriseAmoIds.length > 0;

  const [dbStats, matomoStats, funnelStats] = await Promise.all([
    getStatistiquesDB(scopeFilters),
    // Stats Matomo uniquement si accès global (pas de filtre entreprise)
    hasEntrepriseFilter ? Promise.resolve(null) : getMatomoStatistiques(),
    hasEntrepriseFilter ? Promise.resolve(null) : getFunnelSimulateurRGA(),
  ]);

  return {
    ...dbStats,
    // Stats Matomo (0 et tableau vide si filtrées par entreprise car non disponibles)
    nombreVisitesTotales: matomoStats?.nombreVisitesTotales ?? 0,
    visitesParJour: matomoStats?.visitesParJour ?? [],
    funnelSimulateurRGA: funnelStats,
  };
}

/**
 * Retourne des statistiques vides
 */
function getEmptyStatistiques(): Statistiques {
  return {
    nombreComptesCreés: 0,
    nombreDemandesAMO: 0,
    nombreDemandesAMOEnAttente: 0,
    nombreTotalDossiersDS: 0,
    nombreDossiersDSBrouillon: 0,
    nombreDossiersDSEnvoyés: 0,
    nombreVisitesTotales: 0,
    visitesParJour: [],
    funnelSimulateurRGA: null,
  };
}

/**
 * Récupère les statistiques de la base de données
 */
async function getStatistiquesDB(scopeFilters?: ScopeFilters | null) {
  const [
    nombreComptesCreés,
    nombreDemandesAMO,
    nombreDemandesAMOEnAttente,
    nombreTotalDossiersDS,
    nombreDossiersDSBrouillon,
    nombreDossiersDSEnvoyés,
  ] = await Promise.all([
    getNombreComptesCreés(scopeFilters),
    getNombreDemandesAMO(scopeFilters),
    getNombreDemandesAMOEnAttente(scopeFilters),
    getNombreTotalDossiersDS(scopeFilters),
    getNombreDossiersDSBrouillon(scopeFilters),
    getNombreDossiersDSEnvoyés(scopeFilters),
  ]);

  return {
    nombreComptesCreés,
    nombreDemandesAMO,
    nombreDemandesAMOEnAttente,
    nombreTotalDossiersDS,
    nombreDossiersDSBrouillon,
    nombreDossiersDSEnvoyés,
  };
}

/**
 * Compte le nombre total de comptes créés
 * Pour les AMO, on compte uniquement les users qui ont choisi leur entreprise
 */
async function getNombreComptesCreés(scopeFilters?: ScopeFilters | null): Promise<number> {
  // Si filtre par entreprise AMO, compter les users avec une validation pour cette entreprise
  if (scopeFilters?.entrepriseAmoIds && scopeFilters.entrepriseAmoIds.length > 0) {
    const result = await db
      .select({ count: count() })
      .from(users)
      .innerJoin(parcoursPrevention, eq(users.id, parcoursPrevention.userId))
      .innerJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
      .where(inArray(parcoursAmoValidations.entrepriseAmoId, scopeFilters.entrepriseAmoIds));
    return result[0]?.count ?? 0;
  }

  // Sinon, compter tous les users
  const result = await db.select({ count: count() }).from(users);
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre total de demandes d'AMO (toutes validations confondues)
 */
async function getNombreDemandesAMO(scopeFilters?: ScopeFilters | null): Promise<number> {
  if (scopeFilters?.entrepriseAmoIds && scopeFilters.entrepriseAmoIds.length > 0) {
    const result = await db
      .select({ count: count() })
      .from(parcoursAmoValidations)
      .where(inArray(parcoursAmoValidations.entrepriseAmoId, scopeFilters.entrepriseAmoIds));
    return result[0]?.count ?? 0;
  }

  const result = await db.select({ count: count() }).from(parcoursAmoValidations);
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre de demandes d'AMO en attente de validation
 */
async function getNombreDemandesAMOEnAttente(scopeFilters?: ScopeFilters | null): Promise<number> {
  if (scopeFilters?.entrepriseAmoIds && scopeFilters.entrepriseAmoIds.length > 0) {
    const result = await db
      .select({ count: count() })
      .from(parcoursAmoValidations)
      .where(
        and(
          eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE),
          inArray(parcoursAmoValidations.entrepriseAmoId, scopeFilters.entrepriseAmoIds)
        )
      );
    return result[0]?.count ?? 0;
  }

  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE));
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre total de dossiers DS créés
 * Pour les AMO, on filtre via la relation parcours -> validation AMO
 */
async function getNombreTotalDossiersDS(scopeFilters?: ScopeFilters | null): Promise<number> {
  if (scopeFilters?.entrepriseAmoIds && scopeFilters.entrepriseAmoIds.length > 0) {
    const result = await db
      .select({ count: count() })
      .from(dossiersDemarchesSimplifiees)
      .innerJoin(parcoursPrevention, eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id))
      .innerJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
      .where(inArray(parcoursAmoValidations.entrepriseAmoId, scopeFilters.entrepriseAmoIds));
    return result[0]?.count ?? 0;
  }

  const result = await db.select({ count: count() }).from(dossiersDemarchesSimplifiees);
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre de dossiers DS envoyés (ceux qui ont un submittedAt)
 */
async function getNombreDossiersDSEnvoyés(scopeFilters?: ScopeFilters | null): Promise<number> {
  if (scopeFilters?.entrepriseAmoIds && scopeFilters.entrepriseAmoIds.length > 0) {
    const result = await db
      .select({ count: count() })
      .from(dossiersDemarchesSimplifiees)
      .innerJoin(parcoursPrevention, eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id))
      .innerJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
      .where(
        and(
          isNotNull(dossiersDemarchesSimplifiees.submittedAt),
          inArray(parcoursAmoValidations.entrepriseAmoId, scopeFilters.entrepriseAmoIds)
        )
      );
    return result[0]?.count ?? 0;
  }

  const result = await db
    .select({ count: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(isNotNull(dossiersDemarchesSimplifiees.submittedAt));
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre de dossiers DS créés en brouillon (pas encore envoyés)
 */
async function getNombreDossiersDSBrouillon(scopeFilters?: ScopeFilters | null): Promise<number> {
  if (scopeFilters?.entrepriseAmoIds && scopeFilters.entrepriseAmoIds.length > 0) {
    const result = await db
      .select({ count: count() })
      .from(dossiersDemarchesSimplifiees)
      .innerJoin(parcoursPrevention, eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id))
      .innerJoin(parcoursAmoValidations, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
      .where(
        and(
          isNull(dossiersDemarchesSimplifiees.submittedAt),
          inArray(parcoursAmoValidations.entrepriseAmoId, scopeFilters.entrepriseAmoIds)
        )
      );
    return result[0]?.count ?? 0;
  }

  const result = await db
    .select({ count: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(isNull(dossiersDemarchesSimplifiees.submittedAt));
  return result[0]?.count ?? 0;
}
