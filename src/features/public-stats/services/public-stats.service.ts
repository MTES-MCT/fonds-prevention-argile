import { unstable_cache } from "next/cache";
import { and, count, eq, gte, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursPrevention, dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  fetchMatomoEvents,
  fetchMatomoUniqueVisitorsStrict,
  fetchMatomoUniqueVisitorsSeries,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import {
  decouperPeriodeMatomo,
  formaterDateMatomo,
} from "@/features/backoffice/administration/acquisition/domain/decoupage-periode";
import { cumulerCompteurs } from "@/features/backoffice/administration/acquisition/domain/cumul-compteurs";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";
import { SERVICE_START_DATE } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import { aggregerParMois, aggregerCompteursParMois } from "../domain/utils/aggreger-par-mois";
import type { PublicStatsCards, PublicStatsEvolution } from "../domain/types/public-stats.types";

export const PUBLIC_STATS_CACHE_TAG = "public-stats";
const PUBLIC_STATS_CACHE_TTL_SECONDS = 3600;

function lifetimeMatomoRange(): string {
  return `${formaterDateMatomo(SERVICE_START_DATE)},${formaterDateMatomo(new Date())}`;
}

/**
 * Plage des séries mensuelles, calée sur le 1er du mois de lancement : Matomo ne rogne pas ses
 * buckets (cf. gotcha CLAUDE.md), autant demander les mois pleins qu'on affichera.
 */
function lifetimeMatomoRangeMensuel(): string {
  // Getters locaux, comme `formaterDateMatomo` : mélanger UTC et local décalerait le mois de départ.
  const premierMois = new Date(SERVICE_START_DATE.getFullYear(), SERVICE_START_DATE.getMonth(), 1);
  return `${formaterDateMatomo(premierMois)},${formaterDateMatomo(new Date())}`;
}

/** Date de début d'une clé de réponse Matomo multi-sous-période ("début,fin" ou "début" seul). */
function dateDebutMatomo(cle: string): Date | null {
  const debut = new Date(cle.split(",")[0]);
  return Number.isNaN(debut.getTime()) ? null : debut;
}

type ComptagesBdd = Pick<PublicStatsCards, "comptesCrees" | "dossiersEligibiliteDeposes" | "diagnostics">;

async function getComptagesBdd(): Promise<ComptagesBdd> {
  const [comptes, deposes, diagnostics] = await Promise.all([
    db.select({ count: count() }).from(parcoursPrevention),
    db
      .select({ count: count() })
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE),
          isNotNull(dossiersDemarchesSimplifiees.submittedAt)
        )
      ),
    // Étape diagnostic ou déjà passée (devis, factures) : réalisé ou en cours.
    db
      .select({ count: count() })
      .from(parcoursPrevention)
      .where(inArray(parcoursPrevention.currentStep, [Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES])),
  ]);

  return {
    comptesCrees: comptes[0]?.count ?? 0,
    dossiersEligibiliteDeposes: deposes[0]?.count ?? 0,
    diagnostics: diagnostics[0]?.count ?? 0,
  };
}

/**
 * Dates en ISO et non en `Date` : `unstable_cache` sérialise en JSON, donc un `Date` mis en cache
 * revient en `string` au hit suivant et fait planter l'agrégation. Réhydratées par l'appelant.
 */
interface DatesEvolutionBdd {
  comptesCrees: string[];
  dossiersDeposes: string[];
  dossiersValides: string[];
}

async function getDatesEvolutionBdd(): Promise<DatesEvolutionBdd> {
  // Bornées au lancement : les mois antérieurs ne sont pas affichés, autant ne pas les charger
  // — la page est publique et le 1er hit après expiration du cache paie le scan.
  const [comptesCrees, deposes, valides] = await Promise.all([
    db
      .select({ createdAt: parcoursPrevention.createdAt })
      .from(parcoursPrevention)
      .where(gte(parcoursPrevention.createdAt, SERVICE_START_DATE)),
    db
      .select({ submittedAt: dossiersDemarchesSimplifiees.submittedAt })
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE),
          gte(dossiersDemarchesSimplifiees.submittedAt, SERVICE_START_DATE)
        )
      ),
    db
      .select({ processedAt: dossiersDemarchesSimplifiees.processedAt })
      .from(dossiersDemarchesSimplifiees)
      .where(
        and(
          eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE),
          eq(dossiersDemarchesSimplifiees.dsStatus, DSStatus.ACCEPTE),
          gte(dossiersDemarchesSimplifiees.processedAt, SERVICE_START_DATE)
        )
      ),
  ]);

  return {
    comptesCrees: comptesCrees.map((r) => r.createdAt.toISOString()),
    dossiersDeposes: deposes.map((r) => r.submittedAt?.toISOString()).filter((d): d is string => d !== undefined),
    dossiersValides: valides.map((r) => r.processedAt?.toISOString()).filter((d): d is string => d !== undefined),
  };
}

// Seuls les comptages BDD sont cachés ici. Les appels Matomo ont déjà leur propre cache 1 h
// (`fetchMatomoApiCached`) qui, lui, ne mémorise pas les échecs : mettre en cache le résultat
// composé figerait un « Indisponible » pendant une heure, ce que ce choix de cache voulait éviter.
const getComptagesBddCached = unstable_cache(getComptagesBdd, ["public-stats-comptages"], {
  revalidate: PUBLIC_STATS_CACHE_TTL_SECONDS,
  tags: [PUBLIC_STATS_CACHE_TAG],
});

const getDatesEvolutionBddCached = unstable_cache(getDatesEvolutionBdd, ["public-stats-evolution"], {
  revalidate: PUBLIC_STATS_CACHE_TTL_SECONDS,
  tags: [PUBLIC_STATS_CACHE_TAG],
});

/** Trace une panne Matomo et renvoie null, pour la distinguer d'un vrai zéro côté page (cf. logMatomoFailure côté admin). */
async function logMatomoFailure<T>(promise: Promise<T>, contexte: string): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error(`[public-stats] echec ${contexte}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Somme des events de simulation depuis le lancement, en buckets mensuels alignés sur les bornes
 * de calendrier plutôt qu'en `period=range` : Matomo ne pré-archive pas un `range`, qu'il
 * recalculerait ici sur la fenêtre la plus longue possible (ADR-0033). `Promise.all` et non
 * `allSettled` : un total amputé d'une sous-période serait indiscernable d'un vrai chiffre.
 */
async function getSimulationsTotals(): Promise<{ eligibles: number; terminees: number }> {
  const sousPeriodes = decouperPeriodeMatomo(SERVICE_START_DATE, new Date(), "month");
  const compteursParAppel = await Promise.all(
    sousPeriodes.map(({ period, date }) => fetchMatomoEvents({ period, date }))
  );

  const events = cumulerCompteurs(compteursParAppel);
  const eligibles = events.get(MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE) ?? 0;
  const nonEligibles = events.get(MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE) ?? 0;
  return { eligibles, terminees: eligibles + nonEligibles };
}

/**
 * Chiffres cumulés depuis le lancement du service, pour les cartes en tête de la page publique
 * `/stats`. Best-effort sur les compteurs Matomo (visiteurs, simulations) : une panne Matomo ne
 * doit jamais empêcher l'affichage des compteurs BDD, mais ne doit jamais non plus se traduire
 * par un faux 0 — retombe sur `null` (cf. `PublicStatsCards`), affiché comme « Indisponible »
 * côté page.
 */
export async function getPublicStatsCards(): Promise<PublicStatsCards> {
  const [visiteurs, simulations, comptages] = await Promise.all([
    logMatomoFailure(fetchMatomoUniqueVisitorsStrict("range", lifetimeMatomoRange()), "visiteurs"),
    logMatomoFailure(getSimulationsTotals(), "simulations"),
    getComptagesBddCached(),
  ]);

  return {
    visiteurs,
    simulationsEligibles: simulations?.eligibles ?? null,
    simulationsTerminees: simulations?.terminees ?? null,
    ...comptages,
  };
}

/**
 * Séries mensuelles depuis le lancement, pour les 4 mini-graphiques d'évolution de la page
 * publique `/stats`. Mêmes bornes de mois (`SERVICE_START_DATE` → aujourd'hui) pour les 4 séries,
 * afin qu'elles partagent un axe des mois cohérent même quand une métrique démarre plus tard.
 */
export async function getPublicStatsEvolution(): Promise<PublicStatsEvolution> {
  const maintenant = new Date();

  const [visiteursParMois, datesBdd] = await Promise.all([
    logMatomoFailure(fetchMatomoUniqueVisitorsSeries("month", lifetimeMatomoRangeMensuel()), "visiteurs (evolution)"),
    getDatesEvolutionBddCached(),
  ]);

  const versDates = (iso: string[]) => iso.map((valeur) => new Date(valeur));

  return {
    visiteurs: visiteursParMois
      ? aggregerCompteursParMois(visiteursParMois, SERVICE_START_DATE, maintenant, dateDebutMatomo)
      : null,
    comptesCrees: aggregerParMois(versDates(datesBdd.comptesCrees), SERVICE_START_DATE, maintenant),
    dossiersEligibiliteDeposes: aggregerParMois(versDates(datesBdd.dossiersDeposes), SERVICE_START_DATE, maintenant),
    dossiersEligibiliteValides: aggregerParMois(versDates(datesBdd.dossiersValides), SERVICE_START_DATE, maintenant),
  };
}
