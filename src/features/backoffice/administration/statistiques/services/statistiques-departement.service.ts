import { count, eq, and, isNotNull, sql } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursPrevention, prospectQualifications } from "@/shared/database/schema";
import { Step, STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { SituationParticulier } from "@/shared/domain/value-objects/situation-particulier.enum";
import { getDepartementName } from "@/shared/constants/departements.constants";
import { RAISONS_INELIGIBILITE } from "@/features/backoffice/espace-agent/prospects/domain/types";
import type {
  StatistiquesDepartement,
  DepartementDisponible,
  FunnelDepartement,
  DossierParEtape,
  RaisonIneligibiliteStats,
  ZoneDynamique,
} from "../domain/types";

/** Ordre des étapes */
const STEPS_ORDER: Step[] = [Step.CHOIX_AMO, Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

/**
 * Filtre SQL pour isoler un département dans les données JSONB de simulation.
 * Utilise COALESCE pour prioriser les données agent sur les données particulier.
 */
function whereDepartement(codeDept: string) {
  return sql`coalesce(
    ${parcoursPrevention.rgaSimulationDataAgent}->'logement'->>'code_departement',
    ${parcoursPrevention.rgaSimulationData}->'logement'->>'code_departement'
  ) = ${codeDept}`;
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

  // Group by code_departement en JS
  const deptMap = new Map<string, number>();

  for (const p of parcours) {
    const data = p.rgaSimulationDataAgent ?? p.rgaSimulationData;
    const codeDept = data?.logement?.code_departement;
    if (!codeDept) continue;
    deptMap.set(codeDept, (deptMap.get(codeDept) ?? 0) + 1);
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
 */
export async function getStatistiquesDepartement(codeDepartement: string): Promise<StatistiquesDepartement> {
  const [funnelSimulateur, dossiersParEtape, raisonsIneligibilite, zonesDynamiques, nombreComptesCreés, totalParcours] =
    await Promise.all([
      getFunnelDepartement(codeDepartement),
      getDossiersParEtape(codeDepartement),
      getRaisonsIneligibilite(codeDepartement),
      getZonesDynamiques(codeDepartement),
      getNombreComptesCreés(codeDepartement),
      getTotalParcours(codeDepartement),
    ]);

  const pourcentageEligibles =
    funnelSimulateur.simulationsCompletees > 0
      ? Math.round((funnelSimulateur.eligibles / funnelSimulateur.simulationsCompletees) * 100)
      : 0;

  return {
    codeDepartement,
    nomDepartement: getDepartementName(codeDepartement),
    totalParcours,
    funnelSimulateur,
    dossiersParEtape,
    raisonsIneligibilite,
    zonesDynamiques,
    nombreComptesCreés,
    pourcentageEligibles,
  };
}

// --- Sous-requêtes ---

async function getTotalParcours(codeDept: string): Promise<number> {
  const result = await db
    .select({ count: count() })
    .from(parcoursPrevention)
    .where(and(isNotNull(parcoursPrevention.rgaSimulationData), whereDepartement(codeDept)));
  return result[0]?.count ?? 0;
}

async function getFunnelDepartement(codeDept: string): Promise<FunnelDepartement> {
  const [simulationsDemarrees, simulationsCompletees, eligibles, nonEligibles] = await Promise.all([
    // Simulations démarrées = parcours avec rgaSimulationData dans ce département
    db
      .select({ count: count() })
      .from(parcoursPrevention)
      .where(and(isNotNull(parcoursPrevention.rgaSimulationData), whereDepartement(codeDept)))
      .then((r) => r[0]?.count ?? 0),

    // Simulations complétées = rgaSimulationCompletedAt non null
    db
      .select({ count: count() })
      .from(parcoursPrevention)
      .where(
        and(
          isNotNull(parcoursPrevention.rgaSimulationCompletedAt),
          whereDepartement(codeDept),
        ),
      )
      .then((r) => r[0]?.count ?? 0),

    // Éligibles = situationParticulier = 'eligible'
    db
      .select({ count: count() })
      .from(parcoursPrevention)
      .where(
        and(
          eq(parcoursPrevention.situationParticulier, SituationParticulier.ELIGIBLE),
          whereDepartement(codeDept),
        ),
      )
      .then((r) => r[0]?.count ?? 0),

    // Non éligibles = via prospect_qualifications decision = 'non_eligible'
    db
      .select({ count: count() })
      .from(prospectQualifications)
      .innerJoin(parcoursPrevention, eq(prospectQualifications.parcoursId, parcoursPrevention.id))
      .where(and(eq(prospectQualifications.decision, "non_eligible"), whereDepartement(codeDept)))
      .then((r) => r[0]?.count ?? 0),
  ]);

  return { simulationsDemarrees, simulationsCompletees, eligibles, nonEligibles };
}

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
  const qualifications = await db
    .select({ raisonsIneligibilite: prospectQualifications.raisonsIneligibilite })
    .from(prospectQualifications)
    .innerJoin(parcoursPrevention, eq(prospectQualifications.parcoursId, parcoursPrevention.id))
    .where(and(eq(prospectQualifications.decision, "non_eligible"), whereDepartement(codeDept)));

  // Flatten et comptage des raisons
  const raisonMap = new Map<string, number>();
  for (const q of qualifications) {
    if (!q.raisonsIneligibilite) continue;
    for (const raison of q.raisonsIneligibilite) {
      // Normaliser : "autre:xxx" → "autre"
      const key = raison.startsWith("autre:") ? "autre" : raison;
      raisonMap.set(key, (raisonMap.get(key) ?? 0) + 1);
    }
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
