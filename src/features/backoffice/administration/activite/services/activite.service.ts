import { count, and, gte, lt, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursActions, parcoursPrevention, users } from "@/shared/database/schema";
import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";
import { ACTION_LABELS_BY_VALUE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import { PERIODES, SERVICE_START_DATE } from "../../tableau-de-bord/domain/types/tableau-de-bord.types";
import type { PeriodeId } from "../../tableau-de-bord/domain/types/tableau-de-bord.types";
import type { ActiviteStats, ActionTypeStat } from "../domain/types/activite.types";

/**
 * Calcule les dates de debut/fin pour une periode donnee.
 * Duplique volontairement tableau-de-bord.service.ts (pattern etabli : chaque
 * service de stats garde ses propres helpers de periode, cf. statistiques-departement.service.ts).
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
 * Calcule la variation en pourcentage entre deux valeurs
 */
function calculerVariation(valeurActuelle: number, valeurPrecedente: number): number | null {
  if (valeurPrecedente === 0) {
    return valeurActuelle > 0 ? 100 : 0;
  }
  return Math.round(((valeurActuelle - valeurPrecedente) / valeurPrecedente) * 100);
}

/**
 * Filtre SQL pour isoler un departement dans les donnees JSONB de simulation du parcours
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
 * Compte les actions par type sur une periode, avec filtrage departement optionnel
 * (jointure sur parcours_prevention uniquement necessaire dans ce cas).
 */
async function countActionsParType(debut: Date, fin: Date, codeDepartement?: string): Promise<Map<string, number>> {
  const conditions = [gte(parcoursActions.createdAt, debut), lt(parcoursActions.createdAt, fin)];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));

    const rows = await db
      .select({ actionType: parcoursActions.actionType, count: count() })
      .from(parcoursActions)
      .innerJoin(parcoursPrevention, eq(parcoursActions.parcoursId, parcoursPrevention.id))
      .where(and(...conditions))
      .groupBy(parcoursActions.actionType);

    return new Map(rows.map((r) => [r.actionType, r.count]));
  }

  const rows = await db
    .select({ actionType: parcoursActions.actionType, count: count() })
    .from(parcoursActions)
    .where(and(...conditions))
    .groupBy(parcoursActions.actionType);

  return new Map(rows.map((r) => [r.actionType, r.count]));
}

/**
 * Compte les demandeurs distincts (parcours_prevention.user_id) touchés par au
 * moins une action sur la periode. Jointure systematique (pas seulement en cas
 * de filtre departement) car user_id vit sur parcours_prevention, pas sur
 * parcours_actions.
 */
async function countDemandeursDistincts(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  const conditions = [gte(parcoursActions.createdAt, debut), lt(parcoursActions.createdAt, fin)];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }

  const rows = await db
    .select({ userId: parcoursPrevention.userId })
    .from(parcoursActions)
    .innerJoin(parcoursPrevention, eq(parcoursActions.parcoursId, parcoursPrevention.id))
    .where(and(...conditions))
    .groupBy(parcoursPrevention.userId);

  return rows.length;
}

/**
 * Compte les demandeurs inscrits sur la periode (users.created_at), avec
 * filtrage departement optionnel. Jointure systematique sur parcours_prevention
 * (chaque demandeur inscrit a un parcours, cf. relation 1:1 documentee).
 */
async function countDemandeursInscrits(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  const conditions = [gte(users.createdAt, debut), lt(users.createdAt, fin)];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.userId, users.id))
    .where(and(...conditions));

  return rows.length;
}

/**
 * Pour chaque demandeur inscrit sur la periode ayant recu au moins une action,
 * la date d'inscription et la date de sa premiere action (min).
 */
async function getPremiereReponseRows(
  debut: Date,
  fin: Date,
  codeDepartement?: string
): Promise<{ inscriptionAt: Date; premiereActionAt: Date }[]> {
  const conditions = [gte(users.createdAt, debut), lt(users.createdAt, fin)];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }

  return db
    .select({
      inscriptionAt: users.createdAt,
      premiereActionAt: sql<Date>`min(${parcoursActions.createdAt})`,
    })
    .from(users)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.userId, users.id))
    .innerJoin(parcoursActions, eq(parcoursActions.parcoursId, parcoursPrevention.id))
    .where(and(...conditions))
    .groupBy(users.id, users.createdAt);
}

/**
 * Delai moyen (en heures) entre l'inscription et la premiere action, et nombre
 * de demandeurs inscrits sur la periode n'ayant recu aucune action a ce jour.
 * Les demandeurs sans reponse sont exclus du delai moyen (biais d'optimisme
 * assume) mais comptabilises a part pour donner ce contexte.
 */
async function getPremiereReponsePeriode(
  debut: Date,
  fin: Date,
  codeDepartement?: string
): Promise<{ delaiMoyenHeures: number | null; sansReponse: number }> {
  const [inscrits, rows] = await Promise.all([
    countDemandeursInscrits(debut, fin, codeDepartement),
    getPremiereReponseRows(debut, fin, codeDepartement),
  ]);

  let delaiMoyenHeures: number | null = null;
  if (rows.length > 0) {
    const diffsHeures = rows.map(
      (r) => (new Date(r.premiereActionAt).getTime() - r.inscriptionAt.getTime()) / (1000 * 60 * 60)
    );
    delaiMoyenHeures = diffsHeures.reduce((a, b) => a + b, 0) / diffsHeures.length;
  }

  return { delaiMoyenHeures, sansReponse: Math.max(inscrits - rows.length, 0) };
}

/**
 * Recupere le nombre d'actions par type sur une periode, avec l'evolution par
 * rapport a la periode precedente de meme duree (null pour "Depuis le debut").
 */
export async function getActiviteStats(periodeId: PeriodeId, codeDepartement?: string): Promise<ActiviteStats> {
  const { debut, fin } = getDateRange(periodeId);
  const previousRange = getPreviousDateRange(periodeId);

  const [
    distribution,
    distributionPrecedente,
    demandeursDistinctsActuel,
    demandeursDistinctsPrecedent,
    premiereReponseActuelle,
    premiereReponsePrecedente,
  ] = await Promise.all([
    countActionsParType(debut, fin, codeDepartement),
    previousRange
      ? countActionsParType(previousRange.debut, previousRange.fin, codeDepartement)
      : Promise.resolve(new Map<string, number>()),
    countDemandeursDistincts(debut, fin, codeDepartement),
    previousRange
      ? countDemandeursDistincts(previousRange.debut, previousRange.fin, codeDepartement)
      : Promise.resolve(0),
    getPremiereReponsePeriode(debut, fin, codeDepartement),
    previousRange
      ? getPremiereReponsePeriode(previousRange.debut, previousRange.fin, codeDepartement)
      : Promise.resolve({ delaiMoyenHeures: null, sansReponse: 0 }),
  ]);

  let totalActuel = 0;
  for (const c of distribution.values()) totalActuel += c;

  let totalPrecedent = 0;
  for (const c of distributionPrecedente.values()) totalPrecedent += c;

  const parType: ActionTypeStat[] = Array.from(distribution.entries())
    .map(([actionType, actionCount]) => ({
      actionType,
      label: ACTION_LABELS_BY_VALUE[actionType] ?? actionType,
      count: actionCount,
      pourcentage: totalActuel > 0 ? Math.round((actionCount / totalActuel) * 100) : 0,
      variation: previousRange ? calculerVariation(actionCount, distributionPrecedente.get(actionType) ?? 0) : null,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    total: {
      valeur: totalActuel,
      variation: previousRange ? calculerVariation(totalActuel, totalPrecedent) : null,
    },
    demandeursDistincts: {
      valeur: demandeursDistinctsActuel,
      variation: previousRange ? calculerVariation(demandeursDistinctsActuel, demandeursDistinctsPrecedent) : null,
    },
    delaiMoyenPremiereReponse: {
      valeurHeures: premiereReponseActuelle.delaiMoyenHeures,
      variation:
        previousRange &&
        premiereReponseActuelle.delaiMoyenHeures !== null &&
        premiereReponsePrecedente.delaiMoyenHeures !== null
          ? calculerVariation(premiereReponseActuelle.delaiMoyenHeures, premiereReponsePrecedente.delaiMoyenHeures)
          : null,
    },
    demandeursSansReponse: {
      valeur: premiereReponseActuelle.sansReponse,
      variation: previousRange
        ? calculerVariation(premiereReponseActuelle.sansReponse, premiereReponsePrecedente.sansReponse)
        : null,
    },
    parType,
  };
}
