import { count, and, gte, lt, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  parcoursPrevention,
  parcoursAmoValidations,
  dossiersDemarchesSimplifiees,
} from "@/shared/database/schema";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import type { TableauDeBordStats, PeriodeId } from "../domain/types/tableau-de-bord.types";
import { PERIODES, SERVICE_START_DATE } from "../domain/types/tableau-de-bord.types";
import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";

/**
 * Calcule les dates de debut/fin pour une periode donnee
 */
function getDateRange(periodeId: PeriodeId): { debut: Date; fin: Date } {
  const fin = new Date();
  const periode = PERIODES.find((p) => p.id === periodeId);

  if (!periode || periode.jours === null) {
    return { debut: SERVICE_START_DATE, fin };
  }

  const debut = new Date();
  debut.setDate(debut.getDate() - periode.jours);
  return { debut, fin };
}

/**
 * Calcule la periode precedente de meme duree (pour la variation)
 */
function getPreviousDateRange(periodeId: PeriodeId): { debut: Date; fin: Date } | null {
  const periode = PERIODES.find((p) => p.id === periodeId);

  if (!periode || periode.jours === null) {
    return null; // Pas de variation pour "depuis le debut"
  }

  const fin = new Date();
  fin.setDate(fin.getDate() - periode.jours);

  const debut = new Date();
  debut.setDate(debut.getDate() - periode.jours * 2);

  return { debut, fin };
}

/**
 * Filtre SQL pour isoler un departement dans les donnees JSONB de simulation
 */
function whereDepartement(codeDept: string) {
  const normalizedCode = normalizeCodeDepartement(codeDept);
  return sql`regexp_replace(
    coalesce(
      ${parcoursPrevention.rgaSimulationDataAgent}->'logement'->>'code_departement',
      ${parcoursPrevention.rgaSimulationData}->'logement'->>'code_departement'
    ),
    '^0+', ''
  ) = ${normalizedCode}`;
}

/**
 * Compte les parcours crees (proxy simulations) sur une periode et optionnellement un departement
 */
async function countSimulations(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  const conditions = [
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
    isNotNull(parcoursPrevention.rgaSimulationData),
  ];

  if (codeDepartement) {
    conditions.push(whereDepartement(codeDepartement));
  }

  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

/**
 * Compte les comptes crees (parcours avec userId) sur une periode et optionnellement un departement
 */
async function countComptesCrees(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  const conditions = [
    isNotNull(parcoursPrevention.userId),
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
  ];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }

  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

/**
 * Compte les demandes AMO envoyees sur une periode et optionnellement un departement
 */
async function countDemandesAmo(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  if (codeDepartement) {
    const result = await db
      .select({ count: count() })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(
        and(
          gte(parcoursAmoValidations.choisieAt, debut),
          lt(parcoursAmoValidations.choisieAt, fin),
          isNotNull(parcoursPrevention.rgaSimulationData),
          whereDepartement(codeDepartement),
        ),
      );
    return result[0]?.count ?? 0;
  }

  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(
      and(
        gte(parcoursAmoValidations.choisieAt, debut),
        lt(parcoursAmoValidations.choisieAt, fin),
      ),
    );
  return result[0]?.count ?? 0;
}

/**
 * Compte les reponses AMO en attente (snapshot actuel, pas filtre par date)
 */
async function countReponsesAmoEnAttente(codeDepartement?: string): Promise<number> {
  if (codeDepartement) {
    const result = await db
      .select({ count: count() })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(
        and(
          eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE),
          isNotNull(parcoursPrevention.rgaSimulationData),
          whereDepartement(codeDepartement),
        ),
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
 * Compte les dossiers Demarche Numerique crees sur une periode
 */
async function countDossiersDN(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  if (codeDepartement) {
    const result = await db
      .select({ count: count() })
      .from(dossiersDemarchesSimplifiees)
      .innerJoin(parcoursPrevention, eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id))
      .where(
        and(
          gte(dossiersDemarchesSimplifiees.createdAt, debut),
          lt(dossiersDemarchesSimplifiees.createdAt, fin),
          isNotNull(parcoursPrevention.rgaSimulationData),
          whereDepartement(codeDepartement),
        ),
      );
    return result[0]?.count ?? 0;
  }

  const result = await db
    .select({ count: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(
      and(
        gte(dossiersDemarchesSimplifiees.createdAt, debut),
        lt(dossiersDemarchesSimplifiees.createdAt, fin),
      ),
    );
  return result[0]?.count ?? 0;
}

/**
 * Compte les demandes archivees sur une periode
 */
async function countDemandesArchivees(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  const conditions = [
    isNotNull(parcoursPrevention.archivedAt),
    gte(parcoursPrevention.archivedAt, debut),
    lt(parcoursPrevention.archivedAt, fin),
  ];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }

  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

/**
 * Calcule la variation en pourcentage entre deux valeurs
 */
function calculerVariation(valeurActuelle: number, valeurPrecedente: number): number | null {
  if (valeurPrecedente === 0) {
    return valeurActuelle > 0 ? 100 : 0;
  }
  return Math.round(((valeurActuelle - valeurPrecedente) / valeurPrecedente) * 100);
}

/**
 * Recupere les statistiques du tableau de bord avec variations
 */
export async function getTableauDeBordStats(
  periodeId: PeriodeId,
  codeDepartement?: string,
): Promise<TableauDeBordStats> {
  const { debut, fin } = getDateRange(periodeId);
  const previousRange = getPreviousDateRange(periodeId);

  // Stats de la periode courante
  const [simulations, comptes, demandesAmo, reponsesAttente, dossiersDN, archivees] =
    await Promise.all([
      countSimulations(debut, fin, codeDepartement),
      countComptesCrees(debut, fin, codeDepartement),
      countDemandesAmo(debut, fin, codeDepartement),
      countReponsesAmoEnAttente(codeDepartement),
      countDossiersDN(debut, fin, codeDepartement),
      countDemandesArchivees(debut, fin, codeDepartement),
    ]);

  const tauxTransformation = simulations > 0 ? Math.round((comptes / simulations) * 1000) / 10 : 0;

  // Stats de la periode precedente (pour les variations)
  let variations: {
    simulations: number | null;
    comptes: number | null;
    tauxTransformation: number | null;
    demandesAmo: number | null;
    reponsesAttente: number | null;
    dossiersDN: number | null;
    archivees: number | null;
  } = {
    simulations: null,
    comptes: null,
    tauxTransformation: null,
    demandesAmo: null,
    reponsesAttente: null,
    dossiersDN: null,
    archivees: null,
  };

  if (previousRange) {
    const [prevSimulations, prevComptes, prevDemandesAmo, prevDossiersDN, prevArchivees] =
      await Promise.all([
        countSimulations(previousRange.debut, previousRange.fin, codeDepartement),
        countComptesCrees(previousRange.debut, previousRange.fin, codeDepartement),
        countDemandesAmo(previousRange.debut, previousRange.fin, codeDepartement),
        countDossiersDN(previousRange.debut, previousRange.fin, codeDepartement),
        countDemandesArchivees(previousRange.debut, previousRange.fin, codeDepartement),
      ]);

    const prevTaux = prevSimulations > 0
      ? Math.round((prevComptes / prevSimulations) * 1000) / 10
      : 0;

    variations = {
      simulations: calculerVariation(simulations, prevSimulations),
      comptes: calculerVariation(comptes, prevComptes),
      tauxTransformation: tauxTransformation - prevTaux !== 0
        ? Math.round((tauxTransformation - prevTaux) * 10) / 10
        : 0,
      demandesAmo: calculerVariation(demandesAmo, prevDemandesAmo),
      reponsesAttente: null, // Pas de variation pour un snapshot
      dossiersDN: calculerVariation(dossiersDN, prevDossiersDN),
      archivees: calculerVariation(archivees, prevArchivees),
    };
  }

  return {
    simulationsLancees: { valeur: simulations, variation: variations.simulations },
    comptesCrees: { valeur: comptes, variation: variations.comptes },
    tauxTransformation: { valeur: tauxTransformation, variation: variations.tauxTransformation },
    demandesAmoEnvoyees: { valeur: demandesAmo, variation: variations.demandesAmo },
    reponsesAmoEnAttente: { valeur: reponsesAttente, variation: variations.reponsesAttente },
    dossiersDemarcheNumerique: { valeur: dossiersDN, variation: variations.dossiersDN },
    demandesArchivees: { valeur: archivees, variation: variations.archivees },
  };
}
