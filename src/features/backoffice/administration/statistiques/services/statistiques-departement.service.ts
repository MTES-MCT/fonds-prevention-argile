import { count, eq, and, isNotNull, sql } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursPrevention, prospectQualifications, parcoursAmoValidations } from "@/shared/database/schema";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step, STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { getDepartementName, normalizeCodeDepartement, toOfficialCodeDepartement } from "@/shared/constants/departements.constants";
import { RAISONS_INELIGIBILITE, QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { MATOMO_EVENTS } from "@/shared/constants";
import { getClientEnv } from "@/shared/config/env.config";
import { fetchMatomoEventsByDepartment } from "../adapters/matomo-api.adapter";
import type {
  StatistiquesDepartement,
  DepartementDisponible,
  DossierParEtape,
  RaisonIneligibiliteStats,
  ZoneDynamique,
} from "../domain/types";

/** Ordre des étapes */
const STEPS_ORDER: Step[] = [Step.CHOIX_AMO, Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

/**
 * Filtre SQL pour isoler un département dans les données JSONB de simulation.
 * Utilise COALESCE pour prioriser les données agent sur les données particulier.
 *
 * Normalise les codes département des deux côtés (SQL et paramètre) en enlevant les zéros
 * initiaux, car le JSONB peut contenir "03" (string), "3" (string via number) ou 3 (number → "3" via ->>).
 * regexp_replace('03', '^0+', '') → '3' = regexp_replace('3', '^0+', '') → '3'
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
 * Récupère la liste des départements ayant des parcours avec données de simulation.
 * Trié par nombre de parcours décroissant.
 */
export async function getAvailableDepartements(): Promise<DepartementDisponible[]> {
  const parcours = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .where(isNotNull(parcoursPrevention.rgaSimulationData));

  // Group by code_departement en JS, normalisé pour éviter les doublons
  // Le JSONB peut contenir : number 3, string "03", string "3" → tous normalisés en "3"
  const deptMap = new Map<string, number>();

  for (const p of parcours) {
    const data = p.rgaSimulationDataAgent ?? p.rgaSimulationData;
    const codeDept = data?.logement?.code_departement;
    if (!codeDept) continue;
    const codeDeptNormalized = normalizeCodeDepartement(codeDept);
    deptMap.set(codeDeptNormalized, (deptMap.get(codeDeptNormalized) ?? 0) + 1);
  }

  return Array.from(deptMap.entries())
    .map(([code, nombreParcours]) => ({
      code,
      nom: getDepartementName(code),
      nombreParcours,
    }))
    .sort((a, b) => b.nombreParcours - a.nombreParcours);
}

/**
 * Récupère les statistiques complètes pour un département donné.
 * Combine données Matomo (simulations anonymes + connectées) et BDD (comptes, dossiers).
 */
export async function getStatistiquesDepartement(codeDepartement: string): Promise<StatistiquesDepartement> {
  const dimensionIdStr = getClientEnv().NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID;
  const dimensionId = dimensionIdStr ? Number(dimensionIdStr) : null;

  // Matomo stocke les codes département au format officiel (avec zéro initial : "03", "24")
  // car ils viennent du BAN adapter. On reconvertit depuis le format normalisé.
  const codeDeptMatomo = toOfficialCodeDepartement(codeDepartement);

  const [matomoEvents, dossiersParEtape, raisonsIneligibilite, zonesDynamiques, nombreComptesCreés] =
    await Promise.all([
      // Matomo : events par département (graceful fallback si indisponible)
      dimensionId
        ? fetchMatomoEventsByDepartment(codeDeptMatomo, dimensionId).catch((err) => {
            console.error("[Stats Département] Erreur Matomo events:", err);
            return new Map<string, number>();
          })
        : Promise.resolve(new Map<string, number>()),
      getDossiersParEtape(codeDepartement),
      getRaisonsIneligibilite(codeDepartement),
      getZonesDynamiques(codeDepartement),
      getNombreComptesCreés(codeDepartement),
    ]);

  const simulationsCommencees = matomoEvents.get(MATOMO_EVENTS.SIMULATEUR_STEP_ADRESSE) ?? 0;
  const simulationsTerminees =
    (matomoEvents.get(MATOMO_EVENTS.SIMULATEUR_RESULT_ELIGIBLE) ?? 0) +
    (matomoEvents.get(MATOMO_EVENTS.SIMULATEUR_RESULT_NON_ELIGIBLE) ?? 0);

  const tauxConversionSimuCompte =
    simulationsCommencees > 0 ? Math.round((nombreComptesCreés / simulationsCommencees) * 100) : 0;

  return {
    codeDepartement,
    nomDepartement: getDepartementName(codeDepartement),
    simulationsCommencees,
    simulationsTerminees,
    matomoDataAvailable: matomoEvents.size > 0,
    nombreComptesCreés,
    tauxConversionSimuCompte,
    dossiersParEtape,
    raisonsIneligibilite,
    zonesDynamiques,
  };
}

// --- Sous-requêtes BDD ---

async function getDossiersParEtape(codeDept: string): Promise<DossierParEtape[]> {
  const results = await Promise.all(
    STEPS_ORDER.map(async (step) => {
      const result = await db
        .select({ count: count() })
        .from(parcoursPrevention)
        .where(
          and(
            eq(parcoursPrevention.currentStep, step),
            isNotNull(parcoursPrevention.rgaSimulationData),
            whereDepartement(codeDept),
          ),
        );
      return { etape: step, label: STEP_LABELS[step], count: result[0]?.count ?? 0 };
    }),
  );
  return results;
}

async function getRaisonsIneligibilite(codeDept: string): Promise<RaisonIneligibiliteStats[]> {
  // 1. Raisons depuis les qualifications allers-vers (tableau de raisons)
  const qualifications = await db
    .select({ raisonsIneligibilite: prospectQualifications.raisonsIneligibilite })
    .from(prospectQualifications)
    .innerJoin(parcoursPrevention, eq(prospectQualifications.parcoursId, parcoursPrevention.id))
    .where(and(eq(prospectQualifications.decision, QualificationDecision.NON_ELIGIBLE), whereDepartement(codeDept)));

  // 2. Raisons depuis les refus AMO (une seule raison par refus)
  const amoRefusals = await db
    .select({ commentaire: parcoursAmoValidations.commentaire })
    .from(parcoursAmoValidations)
    .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
    .where(
      and(
        eq(parcoursAmoValidations.statut, StatutValidationAmo.LOGEMENT_NON_ELIGIBLE),
        whereDepartement(codeDept),
      ),
    );

  // Flatten et comptage des raisons (les deux sources)
  const raisonMap = new Map<string, number>();

  // Allers-vers : tableau de raisons
  for (const q of qualifications) {
    if (!q.raisonsIneligibilite) continue;
    for (const raison of q.raisonsIneligibilite) {
      const key = raison.startsWith("autre:") ? "autre" : raison;
      raisonMap.set(key, (raisonMap.get(key) ?? 0) + 1);
    }
  }

  // AMO : une raison par refus (commentaire = valeur de l'enum RAISONS_INELIGIBILITE)
  for (const a of amoRefusals) {
    if (!a.commentaire) continue;
    const key = a.commentaire.startsWith("autre:") ? "autre" : a.commentaire;
    raisonMap.set(key, (raisonMap.get(key) ?? 0) + 1);
  }

  // Résoudre les labels
  const raisonsRef = RAISONS_INELIGIBILITE as ReadonlyArray<{ value: string; label: string }>;

  return Array.from(raisonMap.entries())
    .map(([raison, raisonCount]) => ({
      raison,
      label: raisonsRef.find((r) => r.value === raison)?.label ?? raison,
      count: raisonCount,
    }))
    .sort((a, b) => b.count - a.count);
}

async function getZonesDynamiques(codeDept: string): Promise<ZoneDynamique[]> {
  const parcours = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .where(and(isNotNull(parcoursPrevention.rgaSimulationData), whereDepartement(codeDept)));

  // Group by commune_nom
  const communeMap = new Map<string, number>();
  for (const p of parcours) {
    const data = p.rgaSimulationDataAgent ?? p.rgaSimulationData;
    const communeNom = data?.logement?.commune_nom;
    if (!communeNom) continue;
    communeMap.set(communeNom, (communeMap.get(communeNom) ?? 0) + 1);
  }

  const zones: ZoneDynamique[] = Array.from(communeMap.entries()).map(([nom, zoneCount]) => ({
    nom,
    type: "commune" as const,
    count: zoneCount,
  }));

  return zones.sort((a, b) => b.count - a.count).slice(0, 10);
}

async function getNombreComptesCreés(codeDept: string): Promise<number> {
  // Compter les parcours distincts ayant un userId (= compte créé) dans ce département
  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(
      and(
        isNotNull(parcoursPrevention.userId),
        isNotNull(parcoursPrevention.rgaSimulationData),
        whereDepartement(codeDept),
      ),
    );
  return result[0]?.count ?? 0;
}
