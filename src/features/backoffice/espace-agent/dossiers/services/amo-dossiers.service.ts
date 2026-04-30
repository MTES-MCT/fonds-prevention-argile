import { count, eq, and, or, asc, isNull, isNotNull, inArray } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention, dossiersDemarchesSimplifiees, users } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { syncDossiersList } from "@/features/parcours/dossiers-ds/services/ds-sync.service";
import type { AmoDossiersData, DossierSuivi } from "../domain/types";

/** Statuts de validation AMO considérés comme refusés */
const STATUTS_REFUSES = [StatutValidationAmo.LOGEMENT_NON_ELIGIBLE, StatutValidationAmo.ACCOMPAGNEMENT_REFUSE];

/**
 * Service pour la page des dossiers de l'espace AMO
 *
 * Fournit les données pour afficher les dossiers suivis et archivés (demandes acceptées)
 */

/**
 * Récupère les données complètes pour la page des dossiers de l'espace AMO
 *
 * @param entrepriseAmoId - ID de l'entreprise AMO
 */
/**
 * @param entrepriseAmoId - ID de l'entreprise AMO, ou `null` pour un accès global (SUPER_ADMIN)
 */
export async function getAmoDossiersData(entrepriseAmoId: string | null): Promise<AmoDossiersData> {
  await syncActiveAmoDossiers(entrepriseAmoId);

  const [nombreDossiersSuivis, nombreDossiersArchives, dossiersSuivis, dossiersArchives] = await Promise.all([
    getNombreDossiersSuivis(entrepriseAmoId),
    getNombreDossiersArchives(entrepriseAmoId),
    getDossiersSuivis(entrepriseAmoId),
    getDossiersArchives(entrepriseAmoId),
  ]);

  return {
    nombreDossiersSuivis,
    nombreDossiersArchives,
    dossiersSuivis,
    dossiersArchives,
  };
}

/**
 * Synchronise les statuts DS des dossiers actifs (étape courante) du scope AMO
 * avant de retourner la liste, pour garantir des statuts à jour à l'écran.
 * Throttling et concurrence sont gérés par syncDossiersList.
 */
async function syncActiveAmoDossiers(entrepriseAmoId: string | null): Promise<void> {
  const rows = await db
    .select({
      parcoursId: dossiersDemarchesSimplifiees.parcoursId,
      step: dossiersDemarchesSimplifiees.step,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      lastSyncAt: dossiersDemarchesSimplifiees.lastSyncAt,
    })
    .from(parcoursAmoValidations)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .innerJoin(
      dossiersDemarchesSimplifiees,
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id),
        eq(dossiersDemarchesSimplifiees.step, parcoursPrevention.currentStep)
      )
    )
    .where(
      and(
        entrepriseAmoId ? eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId) : undefined,
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
        isNull(parcoursPrevention.archivedAt),
        isNotNull(dossiersDemarchesSimplifiees.dsNumber)
      )
    );

  if (rows.length === 0) return;

  await syncDossiersList(rows);
}

/**
 * Compte le nombre de dossiers suivis (demandes acceptées, non archivées)
 *
 * Un dossier est "suivi" si son statut est LOGEMENT_ELIGIBLE et son parcours n'est pas archivé
 */
async function getNombreDossiersSuivis(entrepriseAmoId: string | null): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .where(
      and(
        entrepriseAmoId ? eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId) : undefined,
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
        isNull(parcoursPrevention.archivedAt)
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Compte le nombre de dossiers archivés :
 * - Demandes acceptées puis archivées manuellement par l'AMO
 * - Demandes refusées (logement non éligible ou accompagnement refusé)
 */
async function getNombreDossiersArchives(entrepriseAmoId: string | null): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .where(
      and(
        entrepriseAmoId ? eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId) : undefined,
        or(
          // Acceptées + archivées manuellement
          and(
            eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
            isNotNull(parcoursPrevention.archivedAt)
          ),
          // Refusées (toujours considérées comme archivées)
          inArray(parcoursAmoValidations.statut, STATUTS_REFUSES)
        )
      )
    );

  return result[0]?.count ?? 0;
}

/**
 * Récupère la liste des dossiers suivis (non archivés) avec leurs informations
 *
 * Retourne les dossiers avec statut LOGEMENT_ELIGIBLE et parcours non archivé,
 * triés par date de validation croissante (les plus anciens en premier)
 */
async function getDossiersSuivis(entrepriseAmoId: string | null): Promise<DossierSuivi[]> {
  return getDossiersWithArchiveFilter(entrepriseAmoId, "active");
}

/**
 * Récupère la liste des dossiers archivés avec leurs informations
 *
 * Retourne les dossiers avec statut LOGEMENT_ELIGIBLE et parcours archivé,
 * triés par date de validation croissante (les plus anciens en premier)
 */
async function getDossiersArchives(entrepriseAmoId: string | null): Promise<DossierSuivi[]> {
  return getDossiersWithArchiveFilter(entrepriseAmoId, "archived");
}

/**
 * Récupère les dossiers suivis ou archivés selon le filtre.
 *
 * - "active" : demandes acceptées (LOGEMENT_ELIGIBLE) non archivées
 * - "archived" : demandes acceptées puis archivées + demandes refusées
 */
async function getDossiersWithArchiveFilter(
  entrepriseAmoId: string | null,
  filter: "active" | "archived"
): Promise<DossierSuivi[]> {
  const statusCondition =
    filter === "active"
      ? and(
          eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
          isNull(parcoursPrevention.archivedAt)
        )
      : or(
          // Acceptées + archivées manuellement
          and(
            eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_ELIGIBLE),
            isNotNull(parcoursPrevention.archivedAt)
          ),
          // Refusées (toujours considérées comme archivées)
          inArray(parcoursAmoValidations.statut, STATUTS_REFUSES)
        );

  const results = await db
    .select({
      id: parcoursAmoValidations.id,
      prenom: parcoursAmoValidations.userPrenom,
      nom: parcoursAmoValidations.userNom,
      userPrenom: users.prenom,
      userNom: users.nom,
      valideeAt: parcoursAmoValidations.valideeAt,
      statutValidation: parcoursAmoValidations.statut,
      parcoursId: parcoursAmoValidations.parcoursId,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
      parcoursUpdatedAt: parcoursPrevention.updatedAt,
    })
    .from(parcoursAmoValidations)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, parcoursAmoValidations.parcoursId))
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .where(and(entrepriseAmoId ? eq(parcoursAmoValidations.entrepriseAmoId, entrepriseAmoId) : undefined, statusCondition))
    .orderBy(asc(parcoursAmoValidations.valideeAt));

  // Pour chaque dossier, récupère le dsStatus de l'étape courante
  const dossiersWithDsStatus = await Promise.all(
    results.map(async (row) => {
      const dossierDS = await db
        .select({ dsStatus: dossiersDemarchesSimplifiees.dsStatus })
        .from(dossiersDemarchesSimplifiees)
        .where(
          and(
            eq(dossiersDemarchesSimplifiees.parcoursId, row.parcoursId),
            eq(dossiersDemarchesSimplifiees.step, row.currentStep)
          )
        )
        .limit(1);

      return {
        id: row.id,
        parcoursId: row.parcoursId,
        prenom: row.prenom || row.userPrenom,
        nom: row.nom || row.userNom,
        commune: row.rgaSimulationData?.logement?.commune_nom ?? null,
        codeDepartement: row.rgaSimulationData?.logement?.code_departement ?? null,
        etape: row.currentStep,
        statut: row.currentStatus,
        statutValidation: row.statutValidation,
        dsStatus: dossierDS[0]?.dsStatus ?? null,
        dateValidation: row.valideeAt!,
        dateDernierStatut: row.parcoursUpdatedAt!,
      };
    })
  );

  return dossiersWithDsStatus;
}
