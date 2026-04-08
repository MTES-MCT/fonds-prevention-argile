/**
 * Script de diagnostic final des doublons Matomo
 *
 * Analyses :
 * 1. Ratio events/visits par étape — double-fire ou vrais retours ?
 * 2. Ratio type_logement/start — preuve de double-fire technique
 * 3. Ratio par jour sur 10 derniers jours — pattern temporel
 * 4. Segmentation par device (desktop vs mobile) — corrélé à un type d'appareil ?
 * 5. Comparaison 7j vs 30j vs 90j — le ratio est-il stable dans le temps ?
 *
 * Usage : npx tsx scripts/debug-matomo-events.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const MATOMO_URL = process.env.NEXT_PUBLIC_MATOMO_URL!;
const MATOMO_SITE_ID = process.env.NEXT_PUBLIC_MATOMO_SITE_ID!;
const MATOMO_TOKEN = process.env.MATOMO_API_TOKEN!;

if (!MATOMO_URL || !MATOMO_SITE_ID || !MATOMO_TOKEN) {
  console.error("Variables Matomo manquantes");
  process.exit(1);
}

async function matomoQuery(method: string, extraParams: Record<string, string> = {}) {
  const params = new URLSearchParams({
    module: "API",
    method,
    idSite: MATOMO_SITE_ID,
    format: "JSON",
    token_auth: MATOMO_TOKEN,
    ...extraParams,
  });

  const response = await fetch(MATOMO_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Matomo error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

// Ordre des étapes dans le funnel
const STEP_ORDER = [
  "simulateur_start",
  "simulateur_step_type_logement",
  "simulateur_step_adresse",
  "simulateur_step_etat_maison",
  "simulateur_step_mitoyennete",
  "simulateur_step_indemnisation",
  "simulateur_step_assurance",
  "simulateur_step_proprietaire",
  "simulateur_step_revenus",
  "simulateur_result_eligible",
  "simulateur_result_non_eligible",
];

interface EventRow {
  label: string;
  nb_events: number;
  nb_visits: number;
}

function getEventsMap(actions: EventRow[]): Map<string, EventRow> {
  const map = new Map<string, EventRow>();
  for (const a of actions) {
    map.set(a.label, a);
  }
  return map;
}

// ─── ANALYSE 1 : Ratio par étape + diagnostic automatique ──────────

async function analyseRatioParEtape() {
  console.log("\n" + "=".repeat(75));
  console.log("ANALYSE 1 : Ratio events/visits par étape (7 derniers jours)");
  console.log("=".repeat(75));

  const actions = await matomoQuery("Events.getAction", {
    period: "range",
    date: "last7",
    flat: "1",
  });

  if (!Array.isArray(actions)) return;
  const map = getEventsMap(actions);

  console.log(
    "\n" + "Étape".padEnd(42),
    "Events".padStart(8),
    "Visits".padStart(8),
    "Ratio".padStart(7),
    "Doub.%".padStart(8),
  );
  console.log("-".repeat(75));

  for (const name of STEP_ORDER) {
    const e = map.get(name);
    if (!e) continue;
    const ratio = (e.nb_events / e.nb_visits).toFixed(2);
    const doubPct = (((e.nb_events - e.nb_visits) / e.nb_events) * 100).toFixed(1);
    console.log(
      name.padEnd(42),
      String(e.nb_events).padStart(8),
      String(e.nb_visits).padStart(8),
      ratio.padStart(7),
      `${doubPct}%`.padStart(8),
    );
  }

  // --- Diagnostic automatique ---
  const start = map.get("simulateur_start");
  const typeLgt = map.get("simulateur_step_type_logement");
  const adresse = map.get("simulateur_step_adresse");

  console.log("\n--- Diagnostic automatique ---");

  if (start && typeLgt) {
    const ratio = typeLgt.nb_events / start.nb_events;
    console.log(`\n  simulateur_start events              : ${start.nb_events}`);
    console.log(`  simulateur_step_type_logement events : ${typeLgt.nb_events}`);
    console.log(`  Ratio type_logement / start          : ${ratio.toFixed(3)}`);

    if (typeLgt.nb_events > start.nb_events) {
      console.log(
        `  >>> ANOMALIE : type_logement > start. Impossible dans un parcours linéaire.`,
      );
      console.log(
        `  >>> start est tracké via onClick (1x). type_logement via useEffect (peut double-fire).`,
      );
      console.log(`  >>> Surplus : ${typeLgt.nb_events - start.nb_events} events parasites.`);
    }
  }

  if (start && typeLgt && adresse) {
    // Comparer visits (visiteurs uniques) — devrait être décroissant
    console.log(`\n  Visits (visiteurs uniques) — doit être décroissant :`);
    console.log(`    start           : ${start.nb_visits}`);
    console.log(`    type_logement   : ${typeLgt.nb_visits}`);
    console.log(`    adresse         : ${adresse.nb_visits}`);

    if (typeLgt.nb_visits > start.nb_visits) {
      console.log(`  >>> ANOMALIE : type_logement visits > start visits.`);
      console.log(`  >>> Les visiteurs uniques devraient être décroissants.`);
      console.log(`  >>> Même le comptage visits est gonflé = problème de comptage Matomo.`);
    } else {
      console.log(`  >>> OK : visits décroissants — le gonflement est uniquement sur nb_events.`);
    }
  }

  // Résultats combinés
  const elig = map.get("simulateur_result_eligible");
  const nonElig = map.get("simulateur_result_non_eligible");
  if (elig && nonElig) {
    const totalEvents = elig.nb_events + nonElig.nb_events;
    const totalVisits = elig.nb_visits + nonElig.nb_visits;
    console.log(`\n  Résultats combinés :`);
    console.log(`    Total events : ${totalEvents} (élig: ${elig.nb_events}, non-élig: ${nonElig.nb_events})`);
    console.log(`    Total visits : ${totalVisits} (élig: ${elig.nb_visits}, non-élig: ${nonElig.nb_visits})`);
    console.log(`    Ratio global : ${(totalEvents / totalVisits).toFixed(2)}`);
    console.log(`    Note : total visits peut > visiteurs uniques si un même visiteur est éligible ET non éligible`);
  }
}

// ─── ANALYSE 2 : Ratio par jour (10 derniers jours) ────────────────

async function analyseParJour() {
  console.log("\n" + "=".repeat(75));
  console.log("ANALYSE 2 : Ratio events/visits par JOUR (10 derniers jours)");
  console.log("=".repeat(75));
  console.log("Double-fire = ratio constant | Vrais retours = ratio variable\n");

  const actions = await matomoQuery("Events.getAction", {
    period: "day",
    date: "last10",
    flat: "1",
  });

  if (typeof actions !== "object" || actions === null) return;

  console.log(
    "Date".padEnd(14),
    "start".padStart(10),
    "type_lgt".padStart(10),
    "tl/st".padStart(7),
    "elig(E/V)".padStart(14),
    "r".padStart(5),
    "non_elig(E/V)".padStart(16),
    "r".padStart(5),
  );
  console.log("-".repeat(85));

  const dates = Object.keys(actions).sort();
  for (const date of dates) {
    const dayActions = actions[date];
    if (!Array.isArray(dayActions)) continue;

    const start = dayActions.find((a: EventRow) => a.label === "simulateur_start");
    const typeLgt = dayActions.find((a: EventRow) => a.label === "simulateur_step_type_logement");
    const elig = dayActions.find((a: EventRow) => a.label === "simulateur_result_eligible");
    const nonElig = dayActions.find((a: EventRow) => a.label === "simulateur_result_non_eligible");

    const startE = start?.nb_events ?? 0;
    const typeLgtE = typeLgt?.nb_events ?? 0;
    const tlStRatio = startE > 0 ? (typeLgtE / startE).toFixed(2) : "-";

    const eligStr = elig ? `${elig.nb_events}/${elig.nb_visits}` : "0/0";
    const eligR = elig && elig.nb_visits > 0 ? (elig.nb_events / elig.nb_visits).toFixed(2) : "-";
    const nonEligStr = nonElig ? `${nonElig.nb_events}/${nonElig.nb_visits}` : "0/0";
    const nonEligR =
      nonElig && nonElig.nb_visits > 0 ? (nonElig.nb_events / nonElig.nb_visits).toFixed(2) : "-";

    console.log(
      date.padEnd(14),
      String(startE).padStart(10),
      String(typeLgtE).padStart(10),
      String(tlStRatio).padStart(7),
      eligStr.padStart(14),
      eligR.padStart(5),
      nonEligStr.padStart(16),
      nonEligR.padStart(5),
    );
  }
}

// ─── ANALYSE 3 : Segmentation par device ───────────────────────────

async function analyseParDevice() {
  console.log("\n" + "=".repeat(75));
  console.log("ANALYSE 3 : Segmentation par type d'appareil");
  console.log("=".repeat(75));

  const devices = ["Desktop", "Smartphone", "Tablet"];
  const eventNames = [
    "simulateur_start",
    "simulateur_step_type_logement",
    "simulateur_result_eligible",
    "simulateur_result_non_eligible",
  ];

  for (const device of devices) {
    const segment = `deviceType==${device.toLowerCase()}`;
    const actions = await matomoQuery("Events.getAction", {
      period: "range",
      date: "last7",
      flat: "1",
      segment,
    });

    if (!Array.isArray(actions) || actions.length === 0) {
      console.log(`\n  ${device}: aucune donnée`);
      continue;
    }

    const map = getEventsMap(actions);
    console.log(`\n  --- ${device} ---`);
    console.log(
      "  " + "Étape".padEnd(42),
      "Events".padStart(8),
      "Visits".padStart(8),
      "Ratio".padStart(7),
    );

    for (const name of eventNames) {
      const e = map.get(name);
      if (!e) continue;
      const ratio = (e.nb_events / e.nb_visits).toFixed(2);
      console.log(
        "  " + name.padEnd(42),
        String(e.nb_events).padStart(8),
        String(e.nb_visits).padStart(8),
        ratio.padStart(7),
      );
    }

    const start = map.get("simulateur_start");
    const typeLgt = map.get("simulateur_step_type_logement");
    if (start && typeLgt) {
      const ratio = (typeLgt.nb_events / start.nb_events).toFixed(2);
      console.log(`  type_logement/start ratio : ${ratio}`);
      if (typeLgt.nb_events > start.nb_events) {
        console.log(`  >>> ANOMALIE sur ${device}`);
      }
    }
  }
}

// ─── ANALYSE 4 : Comparaison 7j / 30j / 90j ────────────────────────

async function analyseMultiPeriodes() {
  console.log("\n" + "=".repeat(75));
  console.log("ANALYSE 4 : Stabilité du ratio dans le temps (7j / 30j / 90j)");
  console.log("=".repeat(75));

  const periodes = [
    { label: "7 derniers jours", date: "last7" },
    { label: "30 derniers jours", date: "last30" },
    { label: "90 derniers jours", date: "last90" },
  ];

  const eventNames = [
    "simulateur_start",
    "simulateur_step_type_logement",
    "simulateur_step_adresse",
    "simulateur_result_eligible",
    "simulateur_result_non_eligible",
  ];

  console.log(
    "\n" + "Étape".padEnd(42),
    "7j ratio".padStart(10),
    "30j ratio".padStart(11),
    "90j ratio".padStart(11),
  );
  console.log("-".repeat(75));

  const allMaps: Map<string, EventRow>[] = [];

  for (const p of periodes) {
    const actions = await matomoQuery("Events.getAction", {
      period: "range",
      date: p.date,
      flat: "1",
    });
    allMaps.push(Array.isArray(actions) ? getEventsMap(actions) : new Map());
  }

  for (const name of eventNames) {
    const ratios = allMaps.map((m) => {
      const e = m.get(name);
      return e && e.nb_visits > 0 ? (e.nb_events / e.nb_visits).toFixed(2) : "-";
    });
    console.log(name.padEnd(42), ratios[0].padStart(10), ratios[1].padStart(11), ratios[2].padStart(11));
  }

  // type_logement / start ratio par période
  console.log("\n  type_logement/start (events) :");
  for (let i = 0; i < periodes.length; i++) {
    const start = allMaps[i].get("simulateur_start");
    const typeLgt = allMaps[i].get("simulateur_step_type_logement");
    if (start && typeLgt) {
      const ratio = (typeLgt.nb_events / start.nb_events).toFixed(3);
      console.log(`    ${periodes[i].label.padEnd(25)} : ${ratio}`);
    }
  }
}

// ─── ANALYSE 5 : Conclusion et recommandation ──────────────────────

async function conclusion() {
  console.log("\n" + "=".repeat(75));
  console.log("CONCLUSION");
  console.log("=".repeat(75));

  const actions = await matomoQuery("Events.getAction", {
    period: "range",
    date: "last7",
    flat: "1",
  });

  if (!Array.isArray(actions)) return;
  const map = getEventsMap(actions);

  const start = map.get("simulateur_start");
  const typeLgt = map.get("simulateur_step_type_logement");
  const elig = map.get("simulateur_result_eligible");
  const nonElig = map.get("simulateur_result_non_eligible");

  console.log("\n  Si on bascule sur nb_visits (visiteurs uniques) au lieu de nb_events :");
  if (elig && nonElig) {
    console.log(`    Simulations terminées : ${elig.nb_visits + nonElig.nb_visits} (au lieu de ${elig.nb_events + nonElig.nb_events})`);
    console.log(`    Éligibles             : ${elig.nb_visits} (au lieu de ${elig.nb_events})`);
    console.log(`    Non éligibles         : ${nonElig.nb_visits} (au lieu de ${nonElig.nb_events})`);
  }

  console.log("\n  Recommandation :");
  if (start && typeLgt && typeLgt.nb_events > start.nb_events) {
    console.log("    >>> Double-fire technique confirmé (type_logement > start).");
    console.log("    >>> Correction recommandée : mémoiser trackEvent + retirer answers des deps useEffect.");
    console.log("    >>> En attendant : utiliser nb_visits au lieu de nb_events dans le back-office.");
  } else {
    console.log("    Pas d'anomalie type_logement > start détectée.");
    console.log("    Les doublons sont probablement des vrais retours utilisateur (goBack + re-soumission).");
    console.log("    Recommandation : utiliser nb_visits pour les métriques de conversion.");
  }
}

async function main() {
  console.log("Diagnostic final des doublons Matomo");
  console.log(`URL: ${MATOMO_URL}`);
  console.log(`Site ID: ${MATOMO_SITE_ID}`);
  console.log(`Date: ${new Date().toISOString()}`);

  await analyseRatioParEtape();
  await analyseParJour();
  await analyseParDevice();
  await analyseMultiPeriodes();
  await conclusion();
}

main().catch(console.error);
