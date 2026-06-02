/**
 * Audit (read-only) des codes EPCI des dossiers qui tombent en "fallback" dans le
 * filtre du listing AMO : présents dans les parcours mais absents du référentiel SEO
 * (src/features/seo/data/generated/epci.json) → affichés en code brut au lieu du nom.
 *
 * Pour chaque code EPCI en fallback : nombre de dossiers, département(s) concerné(s),
 * et résolution du nom via geo.api.gouv.fr pour catégoriser :
 *   - "hors top-300"   : EPCI d'un département COUVERT mais absent du référentiel
 *                        (le générateur SEO ne prend que les 300 communes les plus peuplées).
 *   - "hors zone"      : EPCI d'un département NON couvert par le dispositif.
 *   - "code invalide"  : geo.api ne connaît pas ce code (SIREN périmé / fusion).
 *
 * Usage : pnpm tsx scripts/ops/audit-epci-fallback.ts
 * Prérequis : .env.local avec DATABASE_URL.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/shared/database/schema";
import { parcoursPrevention } from "@/shared/database/schema";
import { getDemandeurFirstLogement } from "@/shared/domain/utils/rga-simulation.utils";
import epciData from "@/features/seo/data/generated/epci.json";

interface EpciRef {
  codeSiren: string;
  nom: string;
  codesDepartements: string[];
}

const referentiel = epciData as EpciRef[];
const referentielSirens = new Set(referentiel.map((e) => e.codeSiren));
const departementsCouverts = new Set(referentiel.flatMap((e) => e.codesDepartements));

// --- DB ---
const connectionString =
  process.env.DATABASE_URL ??
  (() => {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST) throw new Error("DATABASE_URL ou DB_HOST requis");
    return `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  })();
const client = postgres(connectionString, { max: 5, idle_timeout: 10 });
const db = drizzle(client, { schema });

async function fetchEpciNom(codeSiren: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://geo.api.gouv.fr/epcis/${codeSiren}?fields=nom`);
    if (!resp.ok) return null; // 404 → code inconnu de geo.api
    const data = (await resp.json()) as { nom?: string };
    return data.nom ?? null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("=".repeat(72));
  console.log("AUDIT EPCI FALLBACK (read-only)");
  console.log("=".repeat(72));
  console.log(
    `Référentiel SEO : ${referentiel.length} EPCI sur ${departementsCouverts.size} départements couverts.`
  );
  console.log();

  const rows = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention);

  // Agrège par code EPCI : nombre de dossiers + départements + commune exemple.
  const byEpci = new Map<string, { count: number; departements: Set<string>; communeExemple: string }>();
  for (const r of rows) {
    const logement = getDemandeurFirstLogement(r);
    const epci = logement?.epci != null ? String(logement.epci) : null;
    if (!epci) continue;
    const dept = logement?.code_departement != null ? String(logement.code_departement) : "?";
    const entry = byEpci.get(epci) ?? { count: 0, departements: new Set<string>(), communeExemple: "" };
    entry.count++;
    entry.departements.add(dept);
    if (!entry.communeExemple && logement?.commune_nom) entry.communeExemple = String(logement.commune_nom);
    byEpci.set(epci, entry);
  }

  const total = [...byEpci.values()].reduce((s, e) => s + e.count, 0);
  const fallbacks = [...byEpci.entries()]
    .filter(([code]) => !referentielSirens.has(code))
    .sort((a, b) => b[1].count - a[1].count);

  const dossiersEnFallback = fallbacks.reduce((s, [, e]) => s + e.count, 0);

  console.log(`Codes EPCI distincts dans les dossiers : ${byEpci.size} (${total} dossiers avec EPCI)`);
  console.log(`Codes EPCI en fallback (absents du référentiel) : ${fallbacks.length} (${dossiersEnFallback} dossiers)`);
  console.log();

  if (fallbacks.length === 0) {
    console.log("Aucun fallback. Tous les EPCI des dossiers sont dans le référentiel.");
    await client.end();
    return;
  }

  console.log("Détail des fallbacks (résolution geo.api) :");
  console.log("-".repeat(72));

  let horsTop300 = 0;
  let horsZone = 0;
  let codeInvalide = 0;

  for (const [code, info] of fallbacks) {
    const nom = await fetchEpciNom(code);
    const depts = [...info.departements].sort();
    const dansZone = depts.some((d) => departementsCouverts.has(d));

    let categorie: string;
    if (!nom) {
      categorie = "CODE INVALIDE (inconnu de geo.api — SIREN périmé/fusion ?)";
      codeInvalide += info.count;
    } else if (dansZone) {
      categorie = "hors top-300 (département couvert, petite commune)";
      horsTop300 += info.count;
    } else {
      categorie = "hors zone (département non couvert)";
      horsZone += info.count;
    }

    console.log(
      `  ${code}  ${(nom ?? "<inconnu>").padEnd(40)} dépt=${depts.join(",")} dossiers=${info.count}  ex=${info.communeExemple || "?"}`
    );
    console.log(`      → ${categorie}`);
    await new Promise((r) => setTimeout(r, 100)); // rate-limit geo.api
  }

  console.log("-".repeat(72));
  console.log("Synthèse (dossiers en fallback) :");
  console.log(`  - hors top-300 (zone couverte)  : ${horsTop300}`);
  console.log(`  - hors zone (dépt non couvert)  : ${horsZone}`);
  console.log(`  - code invalide / périmé        : ${codeInvalide}`);
  console.log();
  console.log(
    "Hypothèse validée si 'hors top-300' domine → régénérer seo:generate ne suffira pas (limite 300 communes)."
  );

  await client.end();
}

main().catch((err) => {
  console.error("Erreur:", err);
  client.end();
  process.exit(1);
});
