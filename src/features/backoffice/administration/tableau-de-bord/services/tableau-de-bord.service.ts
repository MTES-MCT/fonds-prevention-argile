import { count, and, gte, lt, eq, isNotNull, inArray, desc, sql } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  parcoursPrevention,
  parcoursAmoValidations,
  dossiersDemarchesSimplifiees,
  users,
  entreprisesAmo,
  agents,
} from "@/shared/database/schema";
import { prospectQualifications } from "@/shared/database/schema/prospect-qualifications";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { RAISONS_INELIGIBILITE } from "@/features/backoffice/espace-agent/prospects/domain/types/qualification.types";
import { EligibilityService } from "@/features/simulateur/domain/services/eligibility.service";
import { getAgentFirstSimulation, getDemandeurFirstSimulation } from "@/shared/domain/utils/rga-simulation.utils";
import { matchesTerritoire } from "@/shared/database/repositories/parcours-prevention.repository";
import type {
  TableauDeBordStats,
  MatomoSimulationsStats,
  PeriodeId,
  AlerteTendance,
  DemandesArchiveesStats,
  DemandesIneligiblesStats,
  DemandeArchiveeDetail,
  DepartementStats,
  CommuneSimulationsStats,
  MotifArchivage,
  MotifIneligibilite,
} from "../domain/types/tableau-de-bord.types";
import { PERIODES, SERVICE_START_DATE } from "../domain/types/tableau-de-bord.types";
import type { EligibiliteStats } from "../domain/types/eligibilite-stats.types";
import {
  calculerTrancheRevenu,
  isRegionIDF,
  TRANCHES_REVENU,
} from "@/features/simulateur/domain/types/rga-revenus.types";
import type { TrancheRevenuRga } from "@/features/simulateur/domain/types/rga-revenus.types";
import {
  normalizeCodeDepartement,
  toOfficialCodeDepartement,
  getDepartementName,
} from "@/shared/constants/departements.constants";
import { asString } from "@/shared/utils/object.utils";
import {
  fetchMatomoEvents,
  fetchMatomoEventsByDepartment,
  fetchMatomoUniqueVisitors,
  fetchMatomoSimulationsGroupedByDepartment,
  fetchMatomoSimulationsGroupedByDimension,
  buildPartnerSegment,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import type { PartnerKey } from "@/shared/domain/partners";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";
import { getClientEnv } from "@/shared/config/env.config";

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
 * Formate une plage de dates pour l'API Matomo (ex: "2025-01-01,2025-03-30")
 */
function formatMatomoDateRange(debut: Date, fin: Date): string {
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return `${fmt(debut)},${fmt(fin)}`;
}

interface SimulationsMatomoResult {
  eligible: number;
  nonEligible: number;
  total: number;
}

/**
 * Récupère le nombre de simulations terminées depuis Matomo (eligible + non eligible).
 * Utilise les events par département si un code département est spécifié.
 */
async function getSimulationsMatomo(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<SimulationsMatomoResult> {
  const dateRange = formatMatomoDateRange(debut, fin);
  const partnerSegment = buildPartnerSegment(partner);

  let events: Map<string, number>;

  if (codeDepartement) {
    const dimensionIdStr = getClientEnv().NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID;
    const dimensionId = dimensionIdStr ? Number(dimensionIdStr) : null;
    if (!dimensionId) return { eligible: 0, nonEligible: 0, total: 0 };

    const codeDeptMatomo = toOfficialCodeDepartement(codeDepartement);
    events = await fetchMatomoEventsByDepartment(codeDeptMatomo, dimensionId, {
      period: "range",
      date: dateRange,
      extraSegment: partnerSegment,
    });
  } else {
    events = await fetchMatomoEvents({ period: "range", date: dateRange, segment: partnerSegment });
  }

  const eligible = events.get(MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE) ?? 0;
  const nonEligible = events.get(MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE) ?? 0;

  return { eligible, nonEligible, total: eligible + nonEligible };
}

/**
 * Recupere le nombre de visiteurs uniques depuis Matomo, avec filtrage departement optionnel.
 */
async function getUniqueVisitors(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<number> {
  const dateRange = formatMatomoDateRange(debut, fin);
  const segments: string[] = [];

  if (codeDepartement) {
    const dimensionIdStr = getClientEnv().NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID;
    const dimensionId = dimensionIdStr ? Number(dimensionIdStr) : null;
    if (!dimensionId) return 0;

    const codeDeptMatomo = toOfficialCodeDepartement(codeDepartement);
    segments.push(`dimension${dimensionId}==${codeDeptMatomo}`);
  }

  const partnerSegment = buildPartnerSegment(partner);
  if (partnerSegment) segments.push(partnerSegment);

  const segment = segments.length > 0 ? segments.join(";") : undefined;

  return fetchMatomoUniqueVisitors("range", dateRange, segment);
}

/**
 * Helper : condition SQL filtrant les parcours selon l'origine partenaire.
 *
 * Utilise un EXISTS sur la table users pour ne pas multiplier les lignes (vs INNER JOIN).
 * Filtre implicitement les parcours sans userId (anonymes) puisque users.id ne peut matcher null.
 *
 * À combiner avec les autres conditions via `and(...)`.
 */
function whereParcoursPartner(partner: PartnerKey | null | undefined) {
  if (!partner) return undefined;
  return sql`EXISTS (
    SELECT 1 FROM ${users}
    WHERE ${users.id} = ${parcoursPrevention.userId}
    AND ${users.partnerSource} = ${partner}
  )`;
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
async function countSimulations(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<number> {
  const conditions = [
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
    isNotNull(parcoursPrevention.rgaSimulationData),
  ];

  if (codeDepartement) {
    conditions.push(whereDepartement(codeDepartement));
  }
  const partnerCond = whereParcoursPartner(partner);
  if (partnerCond) conditions.push(partnerCond);

  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

/**
 * Compte les simulations eligibles et non éligibles sur une periode
 * Utilise EligibilityService.evaluate() pour determiner l'eligibilite
 */
async function countSimulationsParEligibilite(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<{ eligibles: number; nonEligibles: number }> {
  const conditions = [
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
    isNotNull(parcoursPrevention.rgaSimulationData),
  ];

  if (codeDepartement) {
    conditions.push(whereDepartement(codeDepartement));
  }
  const partnerCond = whereParcoursPartner(partner);
  if (partnerCond) conditions.push(partnerCond);

  const parcours = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .where(and(...conditions));

  let eligibles = 0;
  let nonEligibles = 0;

  for (const p of parcours) {
    // Agent-first : on privilégie la donnée BAN-strict pour la classification éligibilité.
    // `evaluate` accepte une sim partielle ; un parcours sans données du tout
    // sera donc évalué comme non-éligible (cohérent avec l'ancien comportement).
    const evaluation = EligibilityService.evaluate(getAgentFirstSimulation(p) ?? {});
    if (evaluation.result?.eligible) {
      eligibles += 1;
    } else {
      nonEligibles += 1;
    }
  }

  return { eligibles, nonEligibles };
}

/**
 * Compte les comptes crees (parcours avec userId) sur une periode et optionnellement un departement
 */
async function countComptesCrees(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<number> {
  const conditions = [
    isNotNull(parcoursPrevention.userId),
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
  ];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }
  const partnerCond = whereParcoursPartner(partner);
  if (partnerCond) conditions.push(partnerCond);

  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

/**
 * Compte les demandes AMO envoyees sur une periode et optionnellement un departement
 */
async function countDemandesAmo(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<number> {
  // Si filtre departement OU partenaire, on doit join parcours pour appliquer la condition
  if (codeDepartement || partner) {
    const conditions = [gte(parcoursAmoValidations.choisieAt, debut), lt(parcoursAmoValidations.choisieAt, fin)];
    if (codeDepartement) {
      conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
      conditions.push(whereDepartement(codeDepartement));
    }
    const partnerCond = whereParcoursPartner(partner);
    if (partnerCond) conditions.push(partnerCond);

    const result = await db
      .select({ count: count() })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(and(...conditions));
    return result[0]?.count ?? 0;
  }

  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(and(gte(parcoursAmoValidations.choisieAt, debut), lt(parcoursAmoValidations.choisieAt, fin)));
  return result[0]?.count ?? 0;
}

/**
 * Compte les demandes AMO envoyees sur la periode et encore en attente de reponse.
 * Permet de savoir si les demandes sont gerees assez rapidement.
 */
async function countReponsesAmoEnAttente(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<number> {
  const conditions = [
    gte(parcoursAmoValidations.choisieAt, debut),
    lt(parcoursAmoValidations.choisieAt, fin),
    eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE),
  ];

  const partnerCond = whereParcoursPartner(partner);

  if (codeDepartement || partnerCond) {
    if (codeDepartement) {
      conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
      conditions.push(whereDepartement(codeDepartement));
    }
    if (partnerCond) conditions.push(partnerCond);

    const result = await db
      .select({ count: count() })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(and(...conditions));
    return result[0]?.count ?? 0;
  }

  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(and(...conditions));
  return result[0]?.count ?? 0;
}

/**
 * Compte les dossiers Demarche Numerique crees sur une periode
 */
async function countDossiersDN(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<number> {
  if (codeDepartement || partner) {
    const conditions = [
      gte(dossiersDemarchesSimplifiees.createdAt, debut),
      lt(dossiersDemarchesSimplifiees.createdAt, fin),
    ];
    if (codeDepartement) {
      conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
      conditions.push(whereDepartement(codeDepartement));
    }
    const partnerCond = whereParcoursPartner(partner);
    if (partnerCond) conditions.push(partnerCond);

    const result = await db
      .select({ count: count() })
      .from(dossiersDemarchesSimplifiees)
      .innerJoin(parcoursPrevention, eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id))
      .where(and(...conditions));
    return result[0]?.count ?? 0;
  }

  const result = await db
    .select({ count: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(and(gte(dossiersDemarchesSimplifiees.createdAt, debut), lt(dossiersDemarchesSimplifiees.createdAt, fin)));
  return result[0]?.count ?? 0;
}

/**
 * Compte les demandes archivees sur une periode
 */
async function countDemandesArchivees(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<number> {
  const conditions = [
    isNotNull(parcoursPrevention.archivedAt),
    gte(parcoursPrevention.archivedAt, debut),
    lt(parcoursPrevention.archivedAt, fin),
  ];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }
  const partnerCond = whereParcoursPartner(partner);
  if (partnerCond) conditions.push(partnerCond);

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
 * Seuil de variation (%) au-delà duquel un motif est considéré "en hausse".
 * Modifiable pour ajuster la sensibilité de l'alerte.
 */
const SEUIL_HAUSSE_MOTIFS = 10;

/**
 * Récupère le nombre d'archivages par motif sur une période donnée
 */
async function getArchiveReasonsDistribution(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<Map<string, number>> {
  const conditions = [
    isNotNull(parcoursPrevention.archivedAt),
    isNotNull(parcoursPrevention.archiveReason),
    gte(parcoursPrevention.archivedAt, debut),
    lt(parcoursPrevention.archivedAt, fin),
  ];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }
  const partnerCond = whereParcoursPartner(partner);
  if (partnerCond) conditions.push(partnerCond);

  const rows = await db
    .select({
      reason: parcoursPrevention.archiveReason,
      count: count(),
    })
    .from(parcoursPrevention)
    .where(and(...conditions))
    .groupBy(parcoursPrevention.archiveReason);

  const distribution = new Map<string, number>();
  for (const row of rows) {
    if (row.reason) {
      distribution.set(row.reason, row.count);
    }
  }
  return distribution;
}

/** Nombre de motifs affichés dans le tableau principal (hors ligne "Autre") */
const TOP_MOTIFS_COUNT = 5;

/**
 * Calcule le détail des demandes archivées : top 5 motifs + "autres" pour le drawer
 */
async function getDemandesArchiveesDetail(
  debut: Date,
  fin: Date,
  previousRange: { debut: Date; fin: Date } | null,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<DemandesArchiveesStats> {
  const distributionActuelle = await getArchiveReasonsDistribution(debut, fin, codeDepartement, partner);
  const distributionPrecedente = previousRange
    ? await getArchiveReasonsDistribution(previousRange.debut, previousRange.fin, codeDepartement, partner)
    : new Map<string, number>();

  // Total archivées sur la période
  let total = 0;
  for (const c of distributionActuelle.values()) {
    total += c;
  }

  if (total === 0) {
    return { total: 0, motifs: [], autresMotifs: [] };
  }

  // Construire la liste complète triée par count décroissant
  const tousMotifs: MotifArchivage[] = [];
  for (const [raison, countActuel] of distributionActuelle) {
    const countPrecedent = distributionPrecedente.get(raison) ?? 0;
    tousMotifs.push({
      raison,
      count: countActuel,
      pourcentage: Math.round((countActuel / total) * 100),
      variation: previousRange ? calculerVariation(countActuel, countPrecedent) : null,
    });
  }

  tousMotifs.sort((a, b) => b.count - a.count);

  return {
    total,
    motifs: tousMotifs.slice(0, TOP_MOTIFS_COUNT),
    autresMotifs: tousMotifs.slice(TOP_MOTIFS_COUNT),
  };
}

/**
 * Récupère le détail individuel des demandes archivées dont le motif
 * n'est pas dans le top 5 (les "autres"), pour le drawer.
 *
 * Retourne la liste des parcours archivés avec info demandeur + structure AMO.
 */
export async function getAutresDemandesArchiveesDetail(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null,
  // Restriction territoriale pour les surfaces nominatives : null/undefined = national
  // (admins), liste non vide = restreint aux départements de l'agent (analyste DDT).
  scopeDepartements?: string[] | null
): Promise<{ total: number; demandes: DemandeArchiveeDetail[] }> {
  const { debut, fin } = getDateRange(periodeId);
  const previousRange = getPreviousDateRange(periodeId);

  // Récupérer la distribution pour identifier les motifs hors top 5
  const detail = await getDemandesArchiveesDetail(debut, fin, previousRange, codeDepartement, partner);
  const autresRaisons = detail.autresMotifs.map((m) => m.raison);

  if (autresRaisons.length === 0) {
    return { total: 0, demandes: [] };
  }

  // Récupérer les parcours individuels ayant ces motifs
  const conditions = [
    isNotNull(parcoursPrevention.archivedAt),
    isNotNull(parcoursPrevention.archiveReason),
    gte(parcoursPrevention.archivedAt, debut),
    lt(parcoursPrevention.archivedAt, fin),
    inArray(parcoursPrevention.archiveReason, autresRaisons),
  ];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }
  const partnerCond = whereParcoursPartner(partner);
  if (partnerCond) conditions.push(partnerCond);

  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      archivedAt: parcoursPrevention.archivedAt,
      archiveReason: parcoursPrevention.archiveReason,
      userPrenom: users.prenom,
      userNom: users.nom,
      agentGivenName: agents.givenName,
      agentUsualName: agents.usualName,
      entrepriseAmoNom: entreprisesAmo.nom,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(parcoursPrevention.userId, users.id))
    .leftJoin(agents, eq(parcoursPrevention.archivedBy, agents.id))
    .leftJoin(parcoursAmoValidations, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
    .leftJoin(entreprisesAmo, eq(parcoursAmoValidations.entrepriseAmoId, entreprisesAmo.id))
    .where(and(...conditions))
    .orderBy(desc(parcoursPrevention.archivedAt));

  // Surface nominative : restreindre aux départements de l'agent (analyste DDT).
  // USER-first comme le listing/contrôle d'accès (cf. RBAC-ROLES §6), pas AGENT-first.
  const scopedRows =
    scopeDepartements && scopeDepartements.length > 0
      ? rows.filter((row) =>
          matchesTerritoire(
            getDemandeurFirstSimulation({
              rgaSimulationData: row.rgaSimulationData,
              rgaSimulationDataAgent: row.rgaSimulationDataAgent,
            }),
            scopeDepartements,
            []
          )
        )
      : rows;

  const demandes: DemandeArchiveeDetail[] = scopedRows.map((row) => ({
    parcoursId: row.parcoursId,
    demandeur: [row.userPrenom, row.userNom].filter(Boolean).join(" ") || "Demandeur inconnu",
    agent: row.agentGivenName ? [row.agentGivenName, row.agentUsualName].filter(Boolean).join(" ") : null,
    structureAmo: row.entrepriseAmoNom ?? null,
    archivedAt: row.archivedAt!,
    raison: row.archiveReason!,
  }));

  return { total: demandes.length, demandes };
}

/**
 * Motifs d'archivage considérés comme "inéligible" (provenant de la qualification ou de l'archivage agent)
 */
const INELIGIBLE_ARCHIVE_REASONS = ["Le demandeur n'est pas éligible", "Non éligible au dispositif"];

/**
 * Récupère la distribution des raisons d'inéligibilité (issues de prospect_qualifications)
 * sur une période donnée.
 *
 * Logique :
 * 1. Sélectionne les parcours archivés sur la période avec un motif d'inéligibilité
 * 2. Joint la dernière qualification non-éligible de chaque parcours (DISTINCT ON)
 * 3. unnest(raisons_ineligibilite) + GROUP BY pour compter chaque sous-raison
 */
async function getIneligibiliteReasonsDistribution(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<{ distribution: Map<string, number>; totalParcours: number }> {
  const conditions = [
    isNotNull(parcoursPrevention.archivedAt),
    gte(parcoursPrevention.archivedAt, debut),
    lt(parcoursPrevention.archivedAt, fin),
    inArray(parcoursPrevention.archiveReason, INELIGIBLE_ARCHIVE_REASONS),
  ];

  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
  }
  const partnerCond = whereParcoursPartner(partner);
  if (partnerCond) conditions.push(partnerCond);

  // Récupérer les parcours inéligibles avec la dernière qualification associée
  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      raisonsIneligibilite: prospectQualifications.raisonsIneligibilite,
    })
    .from(parcoursPrevention)
    .innerJoin(
      prospectQualifications,
      and(
        eq(prospectQualifications.parcoursId, parcoursPrevention.id),
        eq(prospectQualifications.decision, "non_eligible"),
        isNotNull(prospectQualifications.raisonsIneligibilite)
      )
    )
    .where(and(...conditions))
    .orderBy(desc(prospectQualifications.createdAt));

  // Dédoublonner : garder uniquement la qualification la plus récente par parcours
  const seenParcours = new Set<string>();
  const distribution = new Map<string, number>();

  for (const row of rows) {
    if (seenParcours.has(row.parcoursId)) continue;
    seenParcours.add(row.parcoursId);

    // Compter chaque raison d'inéligibilité
    if (row.raisonsIneligibilite) {
      for (const raison of row.raisonsIneligibilite) {
        distribution.set(raison, (distribution.get(raison) ?? 0) + 1);
      }
    }
  }

  return { distribution, totalParcours: seenParcours.size };
}

/**
 * Calcule le détail des demandes inéligibles : top 5 sous-raisons + reste
 */
async function getDemandesIneligiblesDetail(
  debut: Date,
  fin: Date,
  previousRange: { debut: Date; fin: Date } | null,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<DemandesIneligiblesStats> {
  const { distribution: distributionActuelle, totalParcours } = await getIneligibiliteReasonsDistribution(
    debut,
    fin,
    codeDepartement,
    partner
  );
  const { distribution: distributionPrecedente } = previousRange
    ? await getIneligibiliteReasonsDistribution(previousRange.debut, previousRange.fin, codeDepartement, partner)
    : { distribution: new Map<string, number>() };

  if (totalParcours === 0) {
    return { total: 0, motifs: [], autresMotifs: [] };
  }

  // Lookup clé → label
  const labelMap = new Map<string, string>();
  for (const r of RAISONS_INELIGIBILITE) {
    labelMap.set(r.value, r.label);
  }

  // Construire la liste complète triée par count décroissant
  // Pourcentage = nb occurrences raison / nb dossiers inéligibles distincts
  // Un dossier peut avoir plusieurs raisons, donc la somme des % peut dépasser 100%
  const tousMotifs: MotifIneligibilite[] = [];
  for (const [raison, countActuel] of distributionActuelle) {
    const countPrecedent = distributionPrecedente.get(raison) ?? 0;
    tousMotifs.push({
      raison,
      label: labelMap.get(raison) ?? raison,
      count: countActuel,
      pourcentage: Math.round((countActuel / totalParcours) * 100),
      variation: previousRange ? calculerVariation(countActuel, countPrecedent) : null,
    });
  }

  tousMotifs.sort((a, b) => b.count - a.count);

  // total = nombre de parcours distincts (pas la somme des raisons)
  return {
    total: totalParcours,
    motifs: tousMotifs.slice(0, TOP_MOTIFS_COUNT),
    autresMotifs: tousMotifs.slice(TOP_MOTIFS_COUNT),
  };
}

/**
 * Détecte les motifs d'archivage dont la variation dépasse le seuil
 * entre la période courante et la période précédente.
 *
 * Règle de gestion par défaut : un motif est signalé si sa variation > SEUIL_HAUSSE_MOTIFS %.
 */
async function detecterMotifsEnHausse(
  debut: Date,
  fin: Date,
  previousRange: { debut: Date; fin: Date } | null,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<AlerteTendance[]> {
  if (!previousRange) {
    return [];
  }

  const [distributionActuelle, distributionPrecedente] = await Promise.all([
    getArchiveReasonsDistribution(debut, fin, codeDepartement, partner),
    getArchiveReasonsDistribution(previousRange.debut, previousRange.fin, codeDepartement, partner),
  ]);

  const motifsEnHausse: string[] = [];

  for (const [motif, countActuel] of distributionActuelle) {
    const countPrecedent = distributionPrecedente.get(motif) ?? 0;
    const variation = calculerVariation(countActuel, countPrecedent);

    if (variation !== null && variation > SEUIL_HAUSSE_MOTIFS) {
      motifsEnHausse.push(motif);
    }
  }

  if (motifsEnHausse.length === 0) {
    return [];
  }

  const motifsFormates = motifsEnHausse.map((m) => `\u00AB${m}\u00BB`).join(" - ");

  return [
    {
      type: "hausse",
      motifs: motifsEnHausse,
      message: `Les motifs suivants sont en hausse : ${motifsFormates}`,
    },
  ];
}

/**
 * Extrait le code département normalisé depuis les données JSONB d'un parcours.
 * Priorité aux données agent si disponibles.
 */
function extractCodeDepartement(rgaSimulationData: unknown, rgaSimulationDataAgent: unknown): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentData = rgaSimulationDataAgent as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = rgaSimulationData as any;

  const rawCode = asString(agentData?.logement?.code_departement) ?? asString(userData?.logement?.code_departement);
  if (!rawCode) return undefined;
  return normalizeCodeDepartement(rawCode);
}

/**
 * Calcule les statistiques par département : simulations, éligibilité, dossiers DN, transformation.
 * Toujours global (pas de filtre département) pour permettre le classement.
 */
async function getTopDepartementsStats(
  debut: Date,
  fin: Date,
  partner?: PartnerKey | null
): Promise<DepartementStats[]> {
  const partnerCond = whereParcoursPartner(partner);

  // Requête 1 : tous les parcours avec simulation sur la période
  const parcoursConditions = [
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
    isNotNull(parcoursPrevention.rgaSimulationData),
  ];
  if (partnerCond) parcoursConditions.push(partnerCond);

  const parcours = await db
    .select({
      id: parcoursPrevention.id,
      userId: parcoursPrevention.userId,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .where(and(...parcoursConditions));

  // Requête 2 : dossiers DN avec données département du parcours
  const dossiersConditions = [
    gte(dossiersDemarchesSimplifiees.createdAt, debut),
    lt(dossiersDemarchesSimplifiees.createdAt, fin),
    isNotNull(parcoursPrevention.rgaSimulationData),
  ];
  if (partnerCond) dossiersConditions.push(partnerCond);

  const dossiers = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(dossiersDemarchesSimplifiees)
    .innerJoin(parcoursPrevention, eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id))
    .where(and(...dossiersConditions));

  // Grouper les simulations par département + évaluer l'éligibilité + compter les comptes
  const deptSimulations = new Map<string, { total: number; eligibles: number; comptes: number }>();

  for (const p of parcours) {
    const code = extractCodeDepartement(p.rgaSimulationData, p.rgaSimulationDataAgent);
    if (!code) continue;

    const entry = deptSimulations.get(code) ?? { total: 0, eligibles: 0, comptes: 0 };
    entry.total += 1;

    // Compter les comptes créés (parcours avec userId)
    if (p.userId) {
      entry.comptes += 1;
    }

    // Agent-first pour le classement géographique (BAN-strict).
    // `evaluate` accepte une sim partielle ; un parcours sans données du tout
    // sera donc évalué comme non-éligible (cohérent avec l'ancien comportement).
    const evaluation = EligibilityService.evaluate(getAgentFirstSimulation(p) ?? {});
    if (evaluation.result?.eligible) {
      entry.eligibles += 1;
    }

    deptSimulations.set(code, entry);
  }

  // Grouper les dossiers DN par département
  const deptDossiersDN = new Map<string, number>();

  for (const d of dossiers) {
    const code = extractCodeDepartement(d.rgaSimulationData, d.rgaSimulationDataAgent);
    if (!code) continue;
    deptDossiersDN.set(code, (deptDossiersDN.get(code) ?? 0) + 1);
  }

  // Assembler les statistiques par département
  const allCodes = new Set([...deptSimulations.keys(), ...deptDossiersDN.keys()]);
  const result: DepartementStats[] = [];

  for (const code of allCodes) {
    const sims = deptSimulations.get(code) ?? { total: 0, eligibles: 0, comptes: 0 };
    const dn = deptDossiersDN.get(code) ?? 0;
    const officialCode = toOfficialCodeDepartement(code);
    const nom = getDepartementName(code);

    result.push({
      codeDepartement: officialCode,
      nomDepartement: nom ?? code,
      simulations: sims.total,
      simulationsEligibles: sims.eligibles,
      pourcentageEligibles: sims.total > 0 ? Math.round((sims.eligibles / sims.total) * 100) : 0,
      comptesCrees: sims.comptes,
      dossiersDN: dn,
      transformationGlobale: sims.total > 0 ? Math.round((dn / sims.total) * 10000) / 100 : 0,
    });
  }

  return result;
}

/**
 * Récupère les simulations par département depuis Matomo (toutes simulations, y compris anonymes).
 * Fusionne avec les données BDD pour comptes créés et dossiers DN.
 */
export async function getTopDepartementsMatomo(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<DepartementStats[]> {
  const { debut, fin } = getDateRange(periodeId);
  const dateRange = formatMatomoDateRange(debut, fin);
  const partnerSegment = buildPartnerSegment(partner);

  const dimensionIdStr = getClientEnv().NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID;
  const dimensionId = dimensionIdStr ? Number(dimensionIdStr) : null;

  if (!dimensionId) {
    console.warn("[getTopDepartementsMatomo] NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID non configuré, fallback BDD");
    return getTopDepartementsStats(debut, fin, partner);
  }

  // Récupérer simulations Matomo par département + données BDD en parallèle
  const [matomoByDept, bddStats] = await Promise.all([
    fetchMatomoSimulationsGroupedByDepartment(dimensionId, {
      period: "range",
      date: dateRange,
      extraSegment: partnerSegment,
    }),
    getTopDepartementsStats(debut, fin, partner),
  ]);

  if (matomoByDept.size === 0) {
    console.warn("[getTopDepartementsMatomo] Matomo n'a retourné aucune donnée, fallback BDD");
    return bddStats;
  }

  // Indexer les données BDD par code département pour fusion rapide
  const bddByDept = new Map(bddStats.map((d) => [d.codeDepartement, d]));

  // Fusionner : simulations Matomo + comptes/DN BDD
  const allCodes = new Set([...matomoByDept.keys(), ...bddByDept.keys()]);
  const result: DepartementStats[] = [];

  for (const code of allCodes) {
    const matomo = matomoByDept.get(code);
    const bdd = bddByDept.get(code);
    const officialCode = toOfficialCodeDepartement(code);
    const nom = getDepartementName(code) ?? bdd?.nomDepartement ?? code;

    const simulations = matomo?.total ?? bdd?.simulations ?? 0;
    const simulationsEligibles = matomo?.eligible ?? bdd?.simulationsEligibles ?? 0;
    const comptesCrees = bdd?.comptesCrees ?? 0;
    const dossiersDN = bdd?.dossiersDN ?? 0;

    result.push({
      codeDepartement: officialCode,
      nomDepartement: nom,
      simulations,
      simulationsEligibles,
      pourcentageEligibles: simulations > 0 ? Math.round((simulationsEligibles / simulations) * 100) : 0,
      comptesCrees,
      dossiersDN,
      transformationGlobale: simulations > 0 ? Math.round((dossiersDN / simulations) * 10000) / 100 : 0,
    });
  }

  // Filtrer par département si demandé
  if (codeDepartement) {
    const normalizedFilter = normalizeCodeDepartement(codeDepartement);
    return result.filter((d) => normalizeCodeDepartement(d.codeDepartement) === normalizedFilter);
  }

  return result;
}

/**
 * Calcule le top 5 des communes par nombre de simulations.
 */
async function getTopCommunesStats(
  debut: Date,
  fin: Date,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<CommuneSimulationsStats[]> {
  const conditions = [
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
    isNotNull(parcoursPrevention.rgaSimulationData),
  ];
  const partnerCond = whereParcoursPartner(partner);
  if (partnerCond) conditions.push(partnerCond);

  const parcours = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .where(and(...conditions));

  // Grouper par commune
  const communeMap = new Map<string, { commune: string; codeDepartement: string; simulations: number }>();

  for (const p of parcours) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentData = p.rgaSimulationDataAgent as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData = p.rgaSimulationData as any;

    const communeNom = asString(agentData?.logement?.commune_nom) ?? asString(userData?.logement?.commune_nom);
    const codeDept = asString(agentData?.logement?.code_departement) ?? asString(userData?.logement?.code_departement);

    if (!communeNom || !codeDept) continue;
    if (codeDepartement && codeDept !== codeDepartement) continue;

    const key = `${communeNom}_${codeDept}`;
    const entry = communeMap.get(key) ?? { commune: communeNom, codeDepartement: codeDept, simulations: 0 };
    entry.simulations += 1;
    communeMap.set(key, entry);
  }

  return [...communeMap.values()].sort((a, b) => b.simulations - a.simulations).slice(0, 5);
}

/**
 * Récupère les simulations par commune depuis Matomo (toutes simulations, y compris anonymes).
 * Fallback sur la BDD si la dimension commune n'est pas configurée ou si Matomo ne retourne rien.
 */
export async function getTopCommunesMatomo(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<CommuneSimulationsStats[]> {
  const { debut, fin } = getDateRange(periodeId);
  const dateRange = formatMatomoDateRange(debut, fin);
  const partnerSegment = buildPartnerSegment(partner);

  const communeDimensionIdStr = getClientEnv().NEXT_PUBLIC_MATOMO_DIMENSION_COMMUNE_ID;
  const communeDimensionId = communeDimensionIdStr ? Number(communeDimensionIdStr) : null;

  if (!communeDimensionId) {
    return getTopCommunesStats(debut, fin, codeDepartement, partner);
  }

  try {
    const matomoByCommune = await fetchMatomoSimulationsGroupedByDimension(communeDimensionId, {
      period: "range",
      date: dateRange,
      extraSegment: partnerSegment,
    });

    if (matomoByCommune.size === 0) {
      return getTopCommunesStats(debut, fin, codeDepartement, partner);
    }

    const result: CommuneSimulationsStats[] = [];

    for (const [communeNom, counts] of matomoByCommune) {
      result.push({
        commune: communeNom,
        codeDepartement: "",
        simulations: counts.total,
      });
    }

    // Trier et garder le top 5
    return result.sort((a, b) => b.simulations - a.simulations).slice(0, 5);
  } catch {
    return getTopCommunesStats(debut, fin, codeDepartement, partner);
  }
}

/**
 * Récupère les statistiques du tableau de bord avec variations
 */
export async function getTableauDeBordStats(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<TableauDeBordStats> {
  const { debut, fin } = getDateRange(periodeId);
  const previousRange = getPreviousDateRange(periodeId);

  // Stats BDD uniquement — pas d'appel Matomo (charge en async cote client)
  const [
    simulations,
    eligibilite,
    comptes,
    demandesAmo,
    reponsesAttente,
    dossiersDN,
    archivees,
    alertes,
    demandesArchiveesDetail,
    demandesIneligiblesDetail,
    topDepartements,
    topCommunes,
  ] = await Promise.all([
    countSimulations(debut, fin, codeDepartement, partner),
    countSimulationsParEligibilite(debut, fin, codeDepartement, partner),
    countComptesCrees(debut, fin, codeDepartement, partner),
    countDemandesAmo(debut, fin, codeDepartement, partner),
    countReponsesAmoEnAttente(debut, fin, codeDepartement, partner),
    countDossiersDN(debut, fin, codeDepartement, partner),
    countDemandesArchivees(debut, fin, codeDepartement, partner),
    detecterMotifsEnHausse(debut, fin, previousRange, codeDepartement, partner),
    getDemandesArchiveesDetail(debut, fin, previousRange, codeDepartement, partner),
    getDemandesIneligiblesDetail(debut, fin, previousRange, codeDepartement, partner),
    getTopDepartementsStats(debut, fin, partner),
    getTopCommunesStats(debut, fin, codeDepartement, partner),
  ]);

  const tauxTransformation = simulations > 0 ? Math.round((comptes / simulations) * 1000) / 10 : 0;

  // Variations BDD
  let variations = {
    simulations: null as number | null,
    eligibles: null as number | null,
    nonEligibles: null as number | null,
    comptes: null as number | null,
    tauxTransformation: null as number | null,
    demandesAmo: null as number | null,
    reponsesAttente: null as number | null,
    dossiersDN: null as number | null,
    archivees: null as number | null,
  };

  if (previousRange) {
    const [
      prevSimulations,
      prevEligibilite,
      prevComptes,
      prevDemandesAmo,
      prevReponsesAttente,
      prevDossiersDN,
      prevArchivees,
    ] = await Promise.all([
      countSimulations(previousRange.debut, previousRange.fin, codeDepartement, partner),
      countSimulationsParEligibilite(previousRange.debut, previousRange.fin, codeDepartement, partner),
      countComptesCrees(previousRange.debut, previousRange.fin, codeDepartement, partner),
      countDemandesAmo(previousRange.debut, previousRange.fin, codeDepartement, partner),
      countReponsesAmoEnAttente(previousRange.debut, previousRange.fin, codeDepartement, partner),
      countDossiersDN(previousRange.debut, previousRange.fin, codeDepartement, partner),
      countDemandesArchivees(previousRange.debut, previousRange.fin, codeDepartement, partner),
    ]);

    const prevTaux = prevSimulations > 0 ? Math.round((prevComptes / prevSimulations) * 1000) / 10 : 0;

    variations = {
      simulations: calculerVariation(simulations, prevSimulations),
      eligibles: calculerVariation(eligibilite.eligibles, prevEligibilite.eligibles),
      nonEligibles: calculerVariation(eligibilite.nonEligibles, prevEligibilite.nonEligibles),
      comptes: calculerVariation(comptes, prevComptes),
      tauxTransformation:
        tauxTransformation - prevTaux !== 0 ? Math.round((tauxTransformation - prevTaux) * 10) / 10 : 0,
      demandesAmo: calculerVariation(demandesAmo, prevDemandesAmo),
      reponsesAttente: calculerVariation(reponsesAttente, prevReponsesAttente),
      dossiersDN: calculerVariation(dossiersDN, prevDossiersDN),
      archivees: calculerVariation(archivees, prevArchivees),
    };
  }

  return {
    simulationsLancees: { valeur: simulations, variation: variations.simulations },
    simulationsEligibles: { valeur: eligibilite.eligibles, variation: variations.eligibles },
    simulationsNonEligibles: { valeur: eligibilite.nonEligibles, variation: variations.nonEligibles },
    // Valeurs par defaut pour Matomo — seront ecrasees cote client par getMatomoSimulationsStats
    simulationsMatomo: { valeur: simulations, variation: variations.simulations },
    simulationsSansInscription: { valeur: 0, variation: null },
    comptesCrees: { valeur: comptes, variation: variations.comptes },
    tauxTransformation: { valeur: tauxTransformation, variation: variations.tauxTransformation },
    demandesAmoEnvoyees: { valeur: demandesAmo, variation: variations.demandesAmo },
    reponsesAmoEnAttente: { valeur: reponsesAttente, variation: variations.reponsesAttente },
    dossiersDemarcheNumerique: { valeur: dossiersDN, variation: variations.dossiersDN },
    demandesArchivees: { valeur: archivees, variation: variations.archivees },
    alertes,
    demandesArchiveesDetail,
    demandesIneligiblesDetail,
    topDepartements,
    topCommunes,
  };
}

/**
 * Recupere les stats Matomo de simulations (appel separe, chargement asynchrone).
 * Retourne eligible/non eligible/total/sans inscription/taux de transformation.
 */
export async function getMatomoSimulationsStats(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<MatomoSimulationsStats> {
  const { debut, fin } = getDateRange(periodeId);
  const previousRange = getPreviousDateRange(periodeId);

  const matomoFallback: SimulationsMatomoResult = { eligible: 0, nonEligible: 0, total: 0 };

  // Comptes crees BDD (filtrés par partenaire via users.partner_source) + visiteurs uniques Matomo (en parallele)
  const [currentMatomo, comptes, prevMatomo, prevComptes, currentVisitors, prevVisitors] = await Promise.all([
    getSimulationsMatomo(debut, fin, codeDepartement, partner).catch(() => matomoFallback),
    countComptesCrees(debut, fin, codeDepartement, partner),
    previousRange
      ? getSimulationsMatomo(previousRange.debut, previousRange.fin, codeDepartement, partner).catch(
          () => matomoFallback
        )
      : Promise.resolve(matomoFallback),
    previousRange
      ? countComptesCrees(previousRange.debut, previousRange.fin, codeDepartement, partner)
      : Promise.resolve(0),
    getUniqueVisitors(debut, fin, codeDepartement, partner).catch(() => 0),
    previousRange
      ? getUniqueVisitors(previousRange.debut, previousRange.fin, codeDepartement, partner).catch(() => 0)
      : Promise.resolve(0),
  ]);

  const variationVisiteurs =
    previousRange && prevVisitors > 0 ? calculerVariation(currentVisitors, prevVisitors) : null;

  if (currentMatomo.total === 0) {
    // Matomo indisponible pour les simulations — on retourne quand meme les visiteurs uniques
    return {
      simulationsMatomo: { valeur: 0, variation: null },
      simulationsEligibles: { valeur: 0, variation: null },
      simulationsNonEligibles: { valeur: 0, variation: null },
      simulationsSansInscription: { valeur: 0, variation: null },
      tauxTransformation: { valeur: 0, variation: null },
      visiteursUniques: { valeur: currentVisitors, variation: variationVisiteurs },
    };
  }

  const sansInscription = Math.max(0, currentMatomo.total - comptes);
  const taux = currentMatomo.total > 0 ? Math.round((comptes / currentMatomo.total) * 1000) / 10 : 0;

  let variationEligibles: number | null = null;
  let variationNonEligibles: number | null = null;
  let variationTotal: number | null = null;
  let variationSansInscription: number | null = null;
  let variationTaux: number | null = null;

  if (previousRange && prevMatomo.total > 0) {
    variationEligibles = calculerVariation(currentMatomo.eligible, prevMatomo.eligible);
    variationNonEligibles = calculerVariation(currentMatomo.nonEligible, prevMatomo.nonEligible);
    variationTotal = calculerVariation(currentMatomo.total, prevMatomo.total);

    const prevSansInscription = Math.max(0, prevMatomo.total - prevComptes);
    variationSansInscription = calculerVariation(sansInscription, prevSansInscription);

    const prevTaux = prevMatomo.total > 0 ? Math.round((prevComptes / prevMatomo.total) * 1000) / 10 : 0;
    variationTaux = taux - prevTaux !== 0 ? Math.round((taux - prevTaux) * 10) / 10 : 0;
  }

  return {
    simulationsMatomo: { valeur: currentMatomo.total, variation: variationTotal },
    simulationsEligibles: { valeur: currentMatomo.eligible, variation: variationEligibles },
    simulationsNonEligibles: { valeur: currentMatomo.nonEligible, variation: variationNonEligibles },
    simulationsSansInscription: { valeur: sansInscription, variation: variationSansInscription },
    tauxTransformation: { valeur: taux, variation: variationTaux },
    visiteursUniques: { valeur: currentVisitors, variation: variationVisiteurs },
  };
}

// ---------------------------------------------------------------------------
// Données d'éligibilité
// ---------------------------------------------------------------------------

interface EligibiliteCounts {
  avecMicroFissures: number;
  sansMicroFissures: number;
  dejaIndemnisees: number;
  nonIndemnisees: number;
  tranches: Record<TrancheRevenuRga, number>;
}

function createEmptyEligibiliteCounts(): EligibiliteCounts {
  return {
    avecMicroFissures: 0,
    sansMicroFissures: 0,
    dejaIndemnisees: 0,
    nonIndemnisees: 0,
    tranches: {
      "très modeste": 0,
      modeste: 0,
      intermédiaire: 0,
      supérieure: 0,
    },
  };
}

/**
 * Calcule les compteurs d'éligibilité en un seul passage sur les parcours.
 * Micro-fissures et indemnisation : sur simulations éligibles uniquement.
 * Tranches de revenus : sur toutes les simulations.
 */
function computeEligibiliteCounts(
  parcours: { rgaSimulationData: unknown; rgaSimulationDataAgent: unknown }[]
): EligibiliteCounts {
  const counts = createEmptyEligibiliteCounts();

  for (const p of parcours) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agentData = p.rgaSimulationDataAgent as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData = p.rgaSimulationData as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const simData = (agentData ?? userData) as any;

    // Tranches de revenus (sur TOUTES les simulations)
    const revenu = simData?.menage?.revenu_rga;
    const personnes = simData?.menage?.personnes;
    const codeRegion = asString(simData?.logement?.code_region);

    if (revenu !== null && revenu !== undefined && personnes && codeRegion) {
      const estIDF = isRegionIDF(codeRegion);
      const tranche = calculerTrancheRevenu(Number(revenu), Number(personnes), estIDF);
      counts.tranches[tranche] += 1;
    }

    // Éligibilité
    const evaluation = EligibilityService.evaluate(simData);
    if (!evaluation.result?.eligible) continue;

    // Micro-fissures (sur éligibles)
    const sinistres = asString(simData?.rga?.sinistres);
    if (sinistres === "saine") {
      counts.sansMicroFissures += 1;
    } else if (sinistres === "très peu endommagée" || sinistres === "endommagée") {
      counts.avecMicroFissures += 1;
    }

    // Indemnisation antérieure (sur éligibles)
    const indemnise = simData?.rga?.indemnise_indemnise_rga;
    if (indemnise === true) {
      counts.dejaIndemnisees += 1;
    } else {
      counts.nonIndemnisees += 1;
    }
  }

  return counts;
}

/**
 * Récupère les statistiques d'éligibilité avec variations.
 */
export async function getEligibiliteStats(
  periodeId: PeriodeId,
  codeDepartement?: string,
  partner?: PartnerKey | null
): Promise<EligibiliteStats> {
  const { debut, fin } = getDateRange(periodeId);
  const previousRange = getPreviousDateRange(periodeId);
  const partnerCond = whereParcoursPartner(partner);

  // Requête : tous les parcours avec simulation sur la période
  const conditions = [
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
    isNotNull(parcoursPrevention.rgaSimulationData),
  ];
  if (codeDepartement) {
    conditions.push(whereDepartement(codeDepartement));
  }
  if (partnerCond) conditions.push(partnerCond);

  const parcoursResult = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .where(and(...conditions));

  const current = computeEligibiliteCounts(parcoursResult);

  // Période précédente pour les variations
  let prev: EligibiliteCounts | null = null;
  if (previousRange) {
    const prevConditions = [
      gte(parcoursPrevention.createdAt, previousRange.debut),
      lt(parcoursPrevention.createdAt, previousRange.fin),
      isNotNull(parcoursPrevention.rgaSimulationData),
    ];
    if (codeDepartement) {
      prevConditions.push(whereDepartement(codeDepartement));
    }
    if (partnerCond) prevConditions.push(partnerCond);

    const prevResult = await db
      .select({
        rgaSimulationData: parcoursPrevention.rgaSimulationData,
        rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
      })
      .from(parcoursPrevention)
      .where(and(...prevConditions));

    prev = computeEligibiliteCounts(prevResult);
  }

  // Top 5 départements (réutilise la fonction existante)
  const allDepts = await getTopDepartementsStats(debut, fin, partner);
  const top5Depts = allDepts
    .sort((a, b) => b.simulations - a.simulations)
    .slice(0, 5)
    .map((d) => ({
      codeDepartement: d.codeDepartement,
      nomDepartement: d.nomDepartement,
      simulations: d.simulations,
    }));

  // Top 5 communes (réutilise la fonction existante)
  const topCommunes = await getTopCommunesStats(debut, fin, codeDepartement, partner);

  // Assembler les résultats avec variations
  const tranchesRevenus = {} as Record<TrancheRevenuRga, { valeur: number; variation: number | null }>;
  for (const tranche of TRANCHES_REVENU) {
    tranchesRevenus[tranche] = {
      valeur: current.tranches[tranche],
      variation: prev ? calculerVariation(current.tranches[tranche], prev.tranches[tranche]) : null,
    };
  }

  return {
    avecMicroFissures: {
      valeur: current.avecMicroFissures,
      variation: prev ? calculerVariation(current.avecMicroFissures, prev.avecMicroFissures) : null,
    },
    sansMicroFissures: {
      valeur: current.sansMicroFissures,
      variation: prev ? calculerVariation(current.sansMicroFissures, prev.sansMicroFissures) : null,
    },
    dejaIndemnisees: {
      valeur: current.dejaIndemnisees,
      variation: prev ? calculerVariation(current.dejaIndemnisees, prev.dejaIndemnisees) : null,
    },
    nonIndemnisees: {
      valeur: current.nonIndemnisees,
      variation: prev ? calculerVariation(current.nonIndemnisees, prev.nonIndemnisees) : null,
    },
    tranchesRevenus,
    topDepartements: top5Depts,
    topCommunes,
  };
}
