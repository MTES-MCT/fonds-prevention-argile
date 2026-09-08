import { and, count, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursPrevention, dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  fetchMatomoEvents,
  fetchMatomoUniqueVisitors,
  fetchMatomoUniqueVisitorsSeries,
} from "@/features/backoffice/administration/acquisition/adapters/matomo-api.adapter";
import { MATOMO_EVENTS } from "@/shared/constants/matomo.constants";
import { SERVICE_START_DATE } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import { aggregerParMois, aggregerCompteursParMois } from "../domain/utils/aggreger-par-mois";
import type { PublicStatsCards, PublicStatsEvolution } from "../domain/types/public-stats.types";

function formatMatomoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lifetimeMatomoRange(): string {
  return `${formatMatomoDate(SERVICE_START_DATE)},${formatMatomoDate(new Date())}`;
}

/** Date de début d'une clé de réponse Matomo multi-sous-période ("début,fin" ou "début" seul). */
function dateDebutMatomo(cle: string): Date | null {
  const debut = new Date(cle.split(",")[0]);
  return Number.isNaN(debut.getTime()) ? null : debut;
}

async function countComptesCrees(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(isNotNull(parcoursPrevention.userId));
  return result[0]?.count ?? 0;
}

async function countDossiersEligibiliteDeposes(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(
      and(eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE), isNotNull(dossiersDemarchesSimplifiees.submittedAt))
    );
  return result[0]?.count ?? 0;
}

/** Parcours à l'étape diagnostic ou déjà passés cette étape (devis, factures) : réalisé ou en cours. */
async function countDiagnostics(): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(inArray(parcoursPrevention.currentStep, [Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES]));
  return result[0]?.count ?? 0;
}

async function getSimulationsTotals(): Promise<{ eligibles: number; terminees: number }> {
  const events = await fetchMatomoEvents({ period: "range", date: lifetimeMatomoRange() });
  const eligibles = events.get(MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE) ?? 0;
  const nonEligibles = events.get(MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE) ?? 0;
  return { eligibles, terminees: eligibles + nonEligibles };
}

/**
 * Chiffres cumulés depuis le lancement du service, pour les cartes en tête de la page publique
 * `/stats`. Best-effort sur les compteurs Matomo (visiteurs, simulations) : une panne Matomo ne
 * doit jamais empêcher l'affichage des compteurs BDD, elle retombe sur 0 pour les seuls
 * compteurs concernés — page publique, jamais d'erreur visible.
 */
export async function getPublicStatsCards(): Promise<PublicStatsCards> {
  const [visiteurs, simulations, comptesCrees, dossiersEligibiliteDeposes, diagnostics] = await Promise.all([
    fetchMatomoUniqueVisitors("range", lifetimeMatomoRange()).catch(() => 0),
    getSimulationsTotals().catch(() => ({ eligibles: 0, terminees: 0 })),
    countComptesCrees(),
    countDossiersEligibiliteDeposes(),
    countDiagnostics(),
  ]);

  return {
    visiteurs,
    simulationsEligibles: simulations.eligibles,
    simulationsTerminees: simulations.terminees,
    comptesCrees,
    dossiersEligibiliteDeposes,
    diagnostics,
  };
}

/**
 * Séries mensuelles depuis le lancement, pour les 4 mini-graphiques d'évolution de la page
 * publique `/stats`. Mêmes bornes de mois (`SERVICE_START_DATE` → aujourd'hui) pour les 4 séries,
 * afin qu'elles partagent un axe des mois cohérent même quand une métrique démarre plus tard.
 */
export async function getPublicStatsEvolution(): Promise<PublicStatsEvolution> {
  const maintenant = new Date();

  const [visiteursParMois, comptesCreesDates, dossiersDeposesDates, dossiersEligibiliteValideesDates] =
    await Promise.all([
      fetchMatomoUniqueVisitorsSeries("month", lifetimeMatomoRange()).catch(() => ({})),
      db
        .select({ createdAt: parcoursPrevention.createdAt })
        .from(parcoursPrevention)
        .where(isNotNull(parcoursPrevention.userId)),
      db
        .select({ submittedAt: dossiersDemarchesSimplifiees.submittedAt })
        .from(dossiersDemarchesSimplifiees)
        .where(isNotNull(dossiersDemarchesSimplifiees.submittedAt)),
      db
        .select({ processedAt: dossiersDemarchesSimplifiees.processedAt })
        .from(dossiersDemarchesSimplifiees)
        .where(
          and(
            eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE),
            eq(dossiersDemarchesSimplifiees.dsStatus, DSStatus.ACCEPTE),
            isNotNull(dossiersDemarchesSimplifiees.processedAt)
          )
        ),
    ]);

  return {
    visiteurs: aggregerCompteursParMois(visiteursParMois, SERVICE_START_DATE, maintenant, dateDebutMatomo),
    comptesCrees: aggregerParMois(
      comptesCreesDates.map((r) => r.createdAt),
      SERVICE_START_DATE,
      maintenant
    ),
    dossiersDeposes: aggregerParMois(
      dossiersDeposesDates.map((r) => r.submittedAt).filter((d): d is Date => d !== null),
      SERVICE_START_DATE,
      maintenant
    ),
    dossiersEligibiliteValides: aggregerParMois(
      dossiersEligibiliteValideesDates.map((r) => r.processedAt).filter((d): d is Date => d !== null),
      SERVICE_START_DATE,
      maintenant
    ),
  };
}
