/**
 * Script de verification des statistiques du Tableau de bord.
 *
 * Execute les memes requetes Drizzle que le service et affiche les resultats
 * pour chaque stat, avec les requetes equivalentes en SQL lisible.
 *
 * Usage :
 *   npx tsx scripts/verify-dashboard-stats.ts
 *   npx tsx scripts/verify-dashboard-stats.ts --periode 30j
 *   npx tsx scripts/verify-dashboard-stats.ts --periode 30j --departement 24
 *
 * Prerequis : BDD locale avec donnees prod restaurees, .env.local configure.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { count, and, gte, lt, eq, isNotNull, inArray, desc, sql } from "drizzle-orm";
import * as schema from "../src/shared/database/schema";
import { parcoursPrevention, parcoursAmoValidations, dossiersDemarchesSimplifiees } from "../src/shared/database/schema";
import { prospectQualifications } from "../src/shared/database/schema/prospect-qualifications";
import { StatutValidationAmo } from "../src/features/parcours/amo/domain/value-objects";
import { EligibilityService } from "../src/features/simulateur/domain/services/eligibility.service";
import { normalizeCodeDepartement, toOfficialCodeDepartement, getDepartementName } from "../src/shared/constants/departements.constants";
import { asString } from "../src/shared/utils/object.utils";

// --- Config ---
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const PERIODE_ID = getArg("periode") ?? "30j";
const CODE_DEPARTEMENT = getArg("departement");

const PERIODES: Record<string, number | null> = {
  "7j": 7,
  "30j": 30,
  "90j": 90,
  "6m": 180,
  "12m": 365,
  tout: null,
};

const SERVICE_START_DATE = new Date("2025-10-16");

// --- DB ---
const connectionString = process.env.DATABASE_URL ?? (() => {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
  if (!DB_HOST) throw new Error("DATABASE_URL ou DB_HOST requis");
  return `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
})();

const client = postgres(connectionString, { max: 5, idle_timeout: 10 });
const db = drizzle(client, { schema });

// --- Helpers ---
function getDateRange(periodeId: string): { debut: Date; fin: Date } {
  const fin = new Date();
  const jours = PERIODES[periodeId];
  if (jours === null || jours === undefined) {
    return { debut: SERVICE_START_DATE, fin };
  }
  const debut = new Date();
  debut.setDate(debut.getDate() - jours);
  return { debut, fin };
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

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

function extractCodeDepartement(rgaSimulationData: unknown, rgaSimulationDataAgent: unknown): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agentData = rgaSimulationDataAgent as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = rgaSimulationData as any;
  const rawCode = asString(agentData?.logement?.code_departement) ?? asString(userData?.logement?.code_departement);
  if (!rawCode) return undefined;
  return normalizeCodeDepartement(rawCode);
}

const INELIGIBLE_ARCHIVE_REASONS = ["Le demandeur n'est pas éligible", "Non éligible au dispositif"];

// --- Stats functions (same as service) ---

async function countSimulations(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  const conditions = [
    gte(parcoursPrevention.createdAt, debut),
    lt(parcoursPrevention.createdAt, fin),
    isNotNull(parcoursPrevention.rgaSimulationData),
  ];
  if (codeDepartement) {
    conditions.push(whereDepartement(codeDepartement));
  }
  const result = await db.select({ count: count() }).from(parcoursPrevention).where(and(...conditions));
  return result[0]?.count ?? 0;
}

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
  const result = await db.select({ count: count() }).from(parcoursPrevention).where(and(...conditions));
  return result[0]?.count ?? 0;
}

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
          whereDepartement(codeDepartement)
        )
      );
    return result[0]?.count ?? 0;
  }
  const result = await db
    .select({ count: count() })
    .from(parcoursAmoValidations)
    .where(and(gte(parcoursAmoValidations.choisieAt, debut), lt(parcoursAmoValidations.choisieAt, fin)));
  return result[0]?.count ?? 0;
}

async function countReponsesAmoEnAttente(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
  const conditions = [
    gte(parcoursAmoValidations.choisieAt, debut),
    lt(parcoursAmoValidations.choisieAt, fin),
    eq(parcoursAmoValidations.statut, StatutValidationAmo.EN_ATTENTE),
  ];
  if (codeDepartement) {
    conditions.push(isNotNull(parcoursPrevention.rgaSimulationData));
    conditions.push(whereDepartement(codeDepartement));
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
          whereDepartement(codeDepartement)
        )
      );
    return result[0]?.count ?? 0;
  }
  const result = await db
    .select({ count: count() })
    .from(dossiersDemarchesSimplifiees)
    .where(and(gte(dossiersDemarchesSimplifiees.createdAt, debut), lt(dossiersDemarchesSimplifiees.createdAt, fin)));
  return result[0]?.count ?? 0;
}

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
  const result = await db.select({ count: count() }).from(parcoursPrevention).where(and(...conditions));
  return result[0]?.count ?? 0;
}

async function countDemandesIneligibles(debut: Date, fin: Date, codeDepartement?: string): Promise<number> {
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
  const result = await db.select({ count: count() }).from(parcoursPrevention).where(and(...conditions));
  return result[0]?.count ?? 0;
}

async function getTopDepartementsStats(debut: Date, fin: Date) {
  const parcours = await db
    .select({
      id: parcoursPrevention.id,
      userId: parcoursPrevention.userId,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .where(
      and(
        gte(parcoursPrevention.createdAt, debut),
        lt(parcoursPrevention.createdAt, fin),
        isNotNull(parcoursPrevention.rgaSimulationData)
      )
    );

  const dossiers = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(dossiersDemarchesSimplifiees)
    .innerJoin(parcoursPrevention, eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id))
    .where(
      and(
        gte(dossiersDemarchesSimplifiees.createdAt, debut),
        lt(dossiersDemarchesSimplifiees.createdAt, fin),
        isNotNull(parcoursPrevention.rgaSimulationData)
      )
    );

  const deptStats = new Map<string, { total: number; eligibles: number; comptes: number }>();
  for (const p of parcours) {
    const code = extractCodeDepartement(p.rgaSimulationData, p.rgaSimulationDataAgent);
    if (!code) continue;
    const entry = deptStats.get(code) ?? { total: 0, eligibles: 0, comptes: 0 };
    entry.total += 1;
    if (p.userId) entry.comptes += 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const simData = (p.rgaSimulationDataAgent ?? p.rgaSimulationData) as any;
    const evaluation = EligibilityService.evaluate(simData);
    if (evaluation.result?.eligible) entry.eligibles += 1;
    deptStats.set(code, entry);
  }

  const deptDN = new Map<string, number>();
  for (const d of dossiers) {
    const code = extractCodeDepartement(d.rgaSimulationData, d.rgaSimulationDataAgent);
    if (!code) continue;
    deptDN.set(code, (deptDN.get(code) ?? 0) + 1);
  }

  const allCodes = new Set([...deptStats.keys(), ...deptDN.keys()]);
  const results: Array<{
    dept: string;
    nom: string;
    simulations: number;
    eligibles: number;
    pctEligibles: number;
    comptes: number;
    dn: number;
    transfo: number;
  }> = [];

  for (const code of allCodes) {
    const sims = deptStats.get(code) ?? { total: 0, eligibles: 0, comptes: 0 };
    const dn = deptDN.get(code) ?? 0;
    results.push({
      dept: toOfficialCodeDepartement(code),
      nom: getDepartementName(code) ?? code,
      simulations: sims.total,
      eligibles: sims.eligibles,
      pctEligibles: sims.total > 0 ? Math.round((sims.eligibles / sims.total) * 100) : 0,
      comptes: sims.comptes,
      dn,
      transfo: sims.total > 0 ? Math.round((dn / sims.total) * 10000) / 100 : 0,
    });
  }

  return results.sort((a, b) => b.transfo - a.transfo);
}

async function getIneligibiliteDetail(debut: Date, fin: Date, codeDepartement?: string) {
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

  const seenParcours = new Set<string>();
  const distribution = new Map<string, number>();

  for (const row of rows) {
    if (seenParcours.has(row.parcoursId)) continue;
    seenParcours.add(row.parcoursId);
    if (row.raisonsIneligibilite) {
      for (const raison of row.raisonsIneligibilite) {
        distribution.set(raison, (distribution.get(raison) ?? 0) + 1);
      }
    }
  }

  return { totalParcours: seenParcours.size, distribution };
}

// --- Main ---
async function main() {
  const { debut, fin } = getDateRange(PERIODE_ID);

  console.log("=".repeat(70));
  console.log("VERIFICATION DES STATS DU TABLEAU DE BORD");
  console.log("=".repeat(70));
  console.log(`Periode     : ${PERIODE_ID} (${fmt(debut)} -> ${fmt(fin)})`);
  console.log(`Departement : ${CODE_DEPARTEMENT ?? "Tous"}`);
  console.log("=".repeat(70));
  console.log();

  // --- Cartes principales ---
  console.log("--- CARTES PRINCIPALES ---");
  console.log();

  const simulations = await countSimulations(debut, fin, CODE_DEPARTEMENT);
  console.log(`Simulations (BDD, parcours avec rgaSimulationData)     : ${simulations}`);
  console.log(`  SQL: SELECT COUNT(*) FROM parcours_prevention`);
  console.log(`       WHERE created_at >= '${fmt(debut)}' AND created_at < '${fmt(fin)}'`);
  console.log(`       AND rga_simulation_data IS NOT NULL`);
  if (CODE_DEPARTEMENT) console.log(`       AND departement = '${CODE_DEPARTEMENT}'`);
  console.log();

  const comptes = await countComptesCrees(debut, fin, CODE_DEPARTEMENT);
  console.log(`Comptes crees (userId IS NOT NULL)                     : ${comptes}`);
  console.log(`  SQL: ... AND user_id IS NOT NULL`);
  console.log();

  const taux = simulations > 0 ? Math.round((comptes / simulations) * 1000) / 10 : 0;
  console.log(`Taux transfo (comptes / simulations)                   : ${taux}%`);
  console.log();

  const demandesAmo = await countDemandesAmo(debut, fin, CODE_DEPARTEMENT);
  console.log(`Demandes AMO envoyees (choisieAt dans periode)         : ${demandesAmo}`);
  console.log(`  SQL: SELECT COUNT(*) FROM parcours_amo_validations`);
  console.log(`       WHERE choisie_at >= '${fmt(debut)}' AND choisie_at < '${fmt(fin)}'`);
  console.log();

  const reponsesAttente = await countReponsesAmoEnAttente(debut, fin, CODE_DEPARTEMENT);
  console.log(`Reponses AMO en attente (envoyees + statut en_attente) : ${reponsesAttente}`);
  console.log(`  SQL: ... AND statut = 'en_attente'`);
  console.log();

  const dossiersDN = await countDossiersDN(debut, fin, CODE_DEPARTEMENT);
  console.log(`Dossiers DN crees                                     : ${dossiersDN}`);
  console.log(`  SQL: SELECT COUNT(*) FROM dossiers_demarches_simplifiees`);
  console.log(`       WHERE created_at >= '${fmt(debut)}' AND created_at < '${fmt(fin)}'`);
  console.log();

  const archivees = await countDemandesArchivees(debut, fin, CODE_DEPARTEMENT);
  const ineligibles = await countDemandesIneligibles(debut, fin, CODE_DEPARTEMENT);
  console.log(`Dossiers sortis du parcours (archivedAt dans periode)  : ${archivees}`);
  console.log(`  dont archives manuelles                              : ${archivees - ineligibles}`);
  console.log(`  dont non eligibles                                   : ${ineligibles}`);
  console.log(`  SQL: ... WHERE archived_at IS NOT NULL AND archived_at >= ... AND archived_at < ...`);
  console.log();

  // --- Ineligibilite detail ---
  console.log("--- DETAIL INELIGIBILITE ---");
  console.log();

  const { totalParcours, distribution } = await getIneligibiliteDetail(debut, fin, CODE_DEPARTEMENT);
  console.log(`Total parcours ineligibles distincts : ${totalParcours}`);

  if (totalParcours > 0) {
    const sorted = [...distribution.entries()].sort((a, b) => b[1] - a[1]);
    console.log();
    console.log("  Raison                                          | Nb rep. | % (/ parcours)");
    console.log("  " + "-".repeat(75));
    for (const [raison, cnt] of sorted) {
      const pct = Math.round((cnt / totalParcours) * 100);
      console.log(`  ${raison.padEnd(49)} | ${String(cnt).padStart(7)} | ${pct}%`);
    }
    let totalRaisons = 0;
    for (const c of distribution.values()) totalRaisons += c;
    console.log();
    console.log(`  Nb total occurrences raisons : ${totalRaisons} (>= ${totalParcours} parcours car multi-raisons)`);
  }
  console.log();

  // --- Top 5 departements ---
  console.log("--- TOP 5 DEPARTEMENTS (tri: Transfo. globale) ---");
  console.log();

  const top = await getTopDepartementsStats(debut, fin);
  const top5 = top.slice(0, 5);

  console.log(
    "  Dpt".padEnd(30) +
      "Simu.".padStart(8) +
      "Elig.".padStart(12) +
      "Comptes".padStart(10) +
      "DN".padStart(8) +
      "Transfo.".padStart(10)
  );
  console.log("  " + "-".repeat(76));
  for (const d of top5) {
    console.log(
      `  ${(d.dept + " " + d.nom).padEnd(28)}` +
        `${String(d.simulations).padStart(8)}` +
        `${(d.eligibles + " (" + d.pctEligibles + "%)").padStart(12)}` +
        `${String(d.comptes).padStart(10)}` +
        `${String(d.dn).padStart(8)}` +
        `${(d.transfo + "%").padStart(10)}`
    );
  }
  console.log();
  console.log(`  Total departements avec activite : ${top.length}`);

  // --- Coherence checks ---
  console.log();
  console.log("--- VERIFICATIONS DE COHERENCE ---");
  console.log();

  if (comptes > simulations) {
    console.log("  [WARN] comptes > simulations : des comptes sans simulation ?");
  } else {
    console.log("  [OK] comptes <= simulations");
  }

  if (dossiersDN > comptes) {
    console.log("  [WARN] dossiers DN > comptes : des dossiers DN sans compte ?");
  } else {
    console.log("  [OK] dossiers DN <= comptes");
  }

  if (reponsesAttente > demandesAmo) {
    console.log("  [WARN] reponses en attente > demandes AMO envoyees");
  } else {
    console.log(`  [OK] reponses en attente (${reponsesAttente}) <= demandes AMO (${demandesAmo})`);
  }

  const topTotalSim = top.reduce((acc, d) => acc + d.simulations, 0);
  if (topTotalSim !== simulations) {
    console.log(`  [INFO] Simulations top depts (${topTotalSim}) vs total (${simulations}) - diff = ${simulations - topTotalSim} (parcours sans departement)`);
  } else {
    console.log(`  [OK] Somme simulations par dept = total`);
  }

  console.log();
  console.log("=".repeat(70));
  console.log("Verification terminee.");
  console.log("=".repeat(70));

  await client.end();
}

main().catch((err) => {
  console.error("Erreur:", err);
  client.end();
  process.exit(1);
});
