import { count, isNotNull, isNull, eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { users, parcoursAmoValidations, dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { getMatomoStatistiques } from "./matomo.service";
import { getFunnelSimulateurRGA } from "./matomo-funnel.service";
import type { Statistiques } from "../domain/types/statistiques.types";

/**
 * Récupère toutes les statistiques globales (DB + Matomo + Funnel)
 */
export async function getStatistiques(): Promise<Statistiques> {
  const [dbStats, matomoStats, funnelStats] = await Promise.all([
    getStatistiquesDB(),
    getMatomoStatistiques(),
    getFunnelSimulateurRGA(),
  ]);

  return {
    ...dbStats,
    ...matomoStats,
    funnelSimulateurRGA: funnelStats,
  };
}

/**
 * Récupère les statistiques de la base de données
 */
async function getStatistiquesDB() {
  const [
    nombreComptesCreés,
    nombreDemandesAMO,
    nombreDemandesAMOEnAttente,
    nombreTotalDossiersDS,
    nombreDossiersDSBrouillon,
    nombreDossiersDSEnvoyés,
  ] = await Promise.all([
    getNombreComptesCreés(),
    getNombreDemandesAMO(),
    getNombreDemandesAMOEnAttente(),
    getNombreTotalDossiersDS(),
    getNombreDossiersDSBrouillon(),
    getNombreDossiersDSEnvoyés(),
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
 */
async function getNombreComptesCreés(): Promise<number> {
  const result = await db.select({ count: count() }).from(users);
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre total de demandes d'AMO (toutes validations confondues)
 */
async function getNombreDemandesAMO(): Promise<number> {
  const result = await db.select({ count: count() }).from(parcoursAmoValidations);
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre de demandes d'AMO en attente de validation
 */
async function getNombreDemandesAMOEnAttente(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE));
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre total de dossiers DS créés)
 */
async function getNombreTotalDossiersDS(): Promise<number> {
  const result = await db.select({ count: count() }).from(dossiersDemarchesSimplifiees);
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre de dossiers DS envoyés (ceux qui ont un submittedAt)
 */
async function getNombreDossiersDSEnvoyés(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(isNotNull(dossiersDemarchesSimplifiees.submittedAt));
  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre de dossiers DS créés en brouillon (pas encore envoyés)
 */
async function getNombreDossiersDSBrouillon(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(isNull(dossiersDemarchesSimplifiees.submittedAt));
  return result[0]?.count ?? 0;
}
