/**
 * Script de debug : analyse approfondie des doublons d'événements Matomo
 *
 * Pistes investiguées :
 * 1. Double-fire du tracking (même événement déclenché 2x sur 1 pageview)
 * 2. Bots / crawlers
 * 3. Distribution réelle (peu de visiteurs avec beaucoup, ou beaucoup avec 2)
 * 4. Corrélation nb_events entre étapes (le ratio est-il constant ?)
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

// ─── PISTE 1 : Double-fire du tracking ──────────────────────────────
// Si le JS déclenche l'event 2x à chaque simulation (bug React useEffect,
// StrictMode, double render...), on verrait un ratio ~2.0 constant.
// Si c'est des vrais retours utilisateur, le ratio varie selon l'étape.

async function analyseRatioParEtape() {
  console.log("\n" + "=".repeat(70));
  console.log("PISTE 1 : Ratio events/visits par étape (double-fire ?)");
  console.log("=".repeat(70));
  console.log("Si double-fire JS : ratio ~2.0 constant sur toutes les étapes");
  console.log("Si vrais retours  : ratio variable, plus élevé sur les premières étapes\n");

  const actions = await matomoQuery("Events.getAction", {
    period: "range",
    date: "last7",
    flat: "1",
  });

  if (!Array.isArray(actions)) return;

  // Ordonner par position dans le funnel
  const ordre = [
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

  console.log(
    "Étape".padEnd(42),
    "Events".padStart(8),
    "Visits".padStart(8),
    "Ratio".padStart(7),
    "Doub.%".padStart(8)
  );
  console.log("-".repeat(75));

  for (const eventName of ordre) {
    const event = actions.find((a: { label: string }) => a.label === eventName);
    if (!event) continue;
    const ratio = (event.nb_events / event.nb_visits).toFixed(2);
    const doubPct = (((event.nb_events - event.nb_visits) / event.nb_events) * 100).toFixed(1);
    console.log(
      eventName.padEnd(42),
      String(event.nb_events).padStart(8),
      String(event.nb_visits).padStart(8),
      String(ratio).padStart(7),
      `${doubPct}%`.padStart(8)
    );
  }

  // Vérifier si eligible + non_eligible events = total résultats
  const eligible = actions.find((a: { label: string }) => a.label === "simulateur_result_eligible");
  const nonEligible = actions.find((a: { label: string }) => a.label === "simulateur_result_non_eligible");
  if (eligible && nonEligible) {
    console.log("\n--- Résultats combinés ---");
    console.log(`  Éligibles   : ${eligible.nb_events} events / ${eligible.nb_visits} visits`);
    console.log(`  Non élig.   : ${nonEligible.nb_events} events / ${nonEligible.nb_visits} visits`);
    console.log(`  Total events: ${eligible.nb_events + nonEligible.nb_events}`);
    console.log(`  Total visits: ${eligible.nb_visits + nonEligible.nb_visits}`);
    console.log(`  ⚠️  Total visits != visiteurs uniques (un visiteur peut être éligible ET non éligible)`);
  }
}

// ─── PISTE 2 : Live API — distribution par visiteur ─────────────────
// On récupère les visites individuelles pour voir le profil des "doublonneurs"

async function analyseLiveVisits() {
  console.log("\n" + "=".repeat(70));
  console.log("PISTE 2 : Détail des visites (Live API) — 7 derniers jours");
  console.log("=".repeat(70));

  // Segment pour avoir les visites avec au moins un événement simulateur
  // Matomo segment OR : eventAction=@simulateur_result
  // =@ signifie "contient"
  const segment = "eventAction=@simulateur_result";

  let visits;
  try {
    visits = await matomoQuery("Live.getLastVisitsDetails", {
      period: "range",
      date: "last7",
      filter_limit: "1000",
      segment,
    });
  } catch (error) {
    console.error("Erreur Live API:", error);
    return;
  }

  if (!Array.isArray(visits)) {
    console.log("Réponse inattendue:", JSON.stringify(visits).substring(0, 200));
    return;
  }

  console.log(`\nNombre de visites récupérées : ${visits.length}`);

  // Par visiteur : compter les events simulateur_result par visite
  interface VisitorInfo {
    totalEvents: number;
    totalVisits: number;
    eligible: number;
    nonEligible: number;
    eventsParVisite: number[];
    deviceType: string;
    browser: string;
    country: string;
    visitDurations: number[];
  }
  const visitors = new Map<string, VisitorInfo>();

  for (const visit of visits) {
    const vid = visit.visitorId || "unknown";
    if (!visitors.has(vid)) {
      visitors.set(vid, {
        totalEvents: 0,
        totalVisits: 0,
        eligible: 0,
        nonEligible: 0,
        eventsParVisite: [],
        deviceType: visit.deviceType || "?",
        browser: visit.browserName || "?",
        country: visit.country || "?",
        visitDurations: [],
      });
    }

    const info = visitors.get(vid)!;
    info.totalVisits++;
    info.visitDurations.push(visit.visitDuration || 0);

    let eventsInThisVisit = 0;
    if (Array.isArray(visit.actionDetails)) {
      for (const action of visit.actionDetails) {
        if (action.eventAction === "simulateur_result_eligible") {
          info.eligible++;
          info.totalEvents++;
          eventsInThisVisit++;
        } else if (action.eventAction === "simulateur_result_non_eligible") {
          info.nonEligible++;
          info.totalEvents++;
          eventsInThisVisit++;
        }
      }
    }
    info.eventsParVisite.push(eventsInThisVisit);
  }

  console.log(`Visiteurs uniques : ${visitors.size}`);

  // ─── Sous-analyse A : résultats multiples dans UNE MÊME visite ───
  // C'est le signe d'un double-fire JS (bug technique)
  let visitesAvecDoubleFire = 0;
  let totalVisites = 0;
  for (const [, info] of visitors) {
    for (const count of info.eventsParVisite) {
      totalVisites++;
      if (count > 1) visitesAvecDoubleFire++;
    }
  }
  console.log(`\n--- Double-fire dans une même visite ? ---`);
  console.log(`Visites totales avec event simulateur_result : ${totalVisites}`);
  console.log(`Visites avec > 1 event result dans la même visite : ${visitesAvecDoubleFire}`);
  console.log(
    `→ ${totalVisites > 0 ? ((visitesAvecDoubleFire / totalVisites) * 100).toFixed(1) : 0}% des visites ont un double-fire`
  );

  if (visitesAvecDoubleFire > 0) {
    console.log("\n  Exemples de visites avec double-fire :");
    let shown = 0;
    for (const [vid, info] of visitors) {
      for (let i = 0; i < info.eventsParVisite.length; i++) {
        if (info.eventsParVisite[i] > 1 && shown < 10) {
          console.log(
            `    Visitor ${vid.substring(0, 16)}... : ${info.eventsParVisite[i]} events dans 1 visite` +
              ` (durée ${info.visitDurations[i]}s, ${info.browser}, ${info.deviceType})`
          );
          shown++;
        }
      }
    }
  }

  // ─── Sous-analyse B : visiteurs multi-visites (vrais retours) ───
  const multiVisitVisitors = [...visitors.entries()].filter(([, v]) => v.totalVisits > 1);
  console.log(`\n--- Visiteurs revenant plusieurs fois ? ---`);
  console.log(`Visiteurs avec 1 seule visite : ${visitors.size - multiVisitVisitors.length}`);
  console.log(`Visiteurs avec plusieurs visites : ${multiVisitVisitors.length}`);

  // ─── Sous-analyse C : distribution complète ───
  const distribution = new Map<number, number>();
  for (const [, v] of visitors) {
    distribution.set(v.totalEvents, (distribution.get(v.totalEvents) || 0) + 1);
  }

  console.log(`\n--- Distribution : nb de résultats par visiteur ---`);
  const sortedDist = [...distribution.entries()].sort((a, b) => a[0] - b[0]);
  for (const [count, nbVisitors] of sortedDist) {
    const bar = "#".repeat(Math.min(nbVisitors, 50));
    console.log(`  ${String(count).padStart(3)} résultat(s) : ${String(nbVisitors).padStart(4)} visiteur(s)  ${bar}`);
  }

  // ─── Sous-analyse D : top "doublonneurs" ───
  const topDoublons = [...visitors.entries()]
    .filter(([, v]) => v.totalEvents > 2)
    .sort((a, b) => b[1].totalEvents - a[1].totalEvents)
    .slice(0, 15);

  if (topDoublons.length > 0) {
    console.log(`\n--- Top 15 visiteurs avec le plus de simulations ---`);
    console.log(
      "VisitorId".padEnd(18),
      "Events".padStart(7),
      "Visits".padStart(7),
      "Elig.".padStart(6),
      "N.Elig.".padStart(8),
      "Device".padStart(10),
      "Browser".padStart(12)
    );
    console.log("-".repeat(72));
    for (const [vid, info] of topDoublons) {
      console.log(
        vid.substring(0, 17).padEnd(18),
        String(info.totalEvents).padStart(7),
        String(info.totalVisits).padStart(7),
        String(info.eligible).padStart(6),
        String(info.nonEligible).padStart(8),
        info.deviceType.padStart(10),
        info.browser.substring(0, 11).padStart(12)
      );
    }
  }
}

// ─── PISTE 3 : Vérifier le tracking JS côté code source ────────────
// Regarder si le trackEvent est appelé dans un useEffect sans deps,
// ou dans un composant rendu 2x par React.StrictMode

async function analyseTrackingCode() {
  console.log("\n" + "=".repeat(70));
  console.log("PISTE 3 : Vérification du code de tracking");
  console.log("=".repeat(70));
  console.log("→ Chercher les appels trackEvent dans le code source...\n");

  // On ne peut pas lire les fichiers ici, mais on signale quoi chercher
  console.log("Vérifier dans le code :");
  console.log("  1. trackEvent dans un useEffect sans tableau de deps → double-fire en StrictMode");
  console.log("  2. trackEvent dans un composant rendu côté serveur + client → double event");
  console.log("  3. trackEvent dans un onClick + un useEffect → event déclenché 2 fois");
  console.log("  4. Plusieurs instances du composant simulateur rendues simultanément");
}

// ─── PISTE 4 : Events par jour (pattern temporel) ──────────────────
// Si double-fire : ratio constant chaque jour
// Si vrais retours : ratio variable

async function analyseParJour() {
  console.log("\n" + "=".repeat(70));
  console.log("PISTE 4 : Ratio events/visits par JOUR (7 derniers jours)");
  console.log("=".repeat(70));
  console.log("Si double-fire : ratio ~constant chaque jour");
  console.log("Si vrais retours : ratio variable\n");

  // On demande period=day et date=last7 pour avoir un tableau par jour
  const actions = await matomoQuery("Events.getAction", {
    period: "day",
    date: "last7",
    flat: "1",
  });

  if (typeof actions !== "object" || actions === null) {
    console.log("Réponse inattendue");
    return;
  }

  console.log(
    "Date".padEnd(14),
    "result_elig (E/V)".padStart(20),
    "ratio".padStart(7),
    "result_non_elig (E/V)".padStart(24),
    "ratio".padStart(7)
  );
  console.log("-".repeat(75));

  const dates = Object.keys(actions).sort();
  for (const date of dates) {
    const dayActions = actions[date];
    if (!Array.isArray(dayActions)) continue;

    const elig = dayActions.find((a: { label: string }) => a.label === "simulateur_result_eligible");
    const nonElig = dayActions.find((a: { label: string }) => a.label === "simulateur_result_non_eligible");

    const eligStr = elig ? `${elig.nb_events}/${elig.nb_visits}` : "0/0";
    const eligRatio = elig && elig.nb_visits > 0 ? (elig.nb_events / elig.nb_visits).toFixed(2) : "-";
    const nonEligStr = nonElig ? `${nonElig.nb_events}/${nonElig.nb_visits}` : "0/0";
    const nonEligRatio = nonElig && nonElig.nb_visits > 0 ? (nonElig.nb_events / nonElig.nb_visits).toFixed(2) : "-";

    console.log(
      date.padEnd(14),
      eligStr.padStart(20),
      eligRatio.padStart(7),
      nonEligStr.padStart(24),
      nonEligRatio.padStart(7)
    );
  }
}

// ─── PISTE 5 : Events.getCategory — autre vue ──────────────────────

async function analyseEventCategory() {
  console.log("\n" + "=".repeat(70));
  console.log("PISTE 5 : Events.getCategory — vue par catégorie");
  console.log("=".repeat(70));

  const categories = await matomoQuery("Events.getCategory", {
    period: "range",
    date: "last7",
    flat: "1",
  });

  if (!Array.isArray(categories)) {
    console.log("Réponse inattendue:", JSON.stringify(categories).substring(0, 200));
    return;
  }

  console.log("Catégorie".padEnd(40), "Events".padStart(8), "Visits".padStart(8), "Ratio".padStart(7));
  console.log("-".repeat(65));
  for (const cat of categories.slice(0, 15)) {
    const ratio = cat.nb_visits > 0 ? (cat.nb_events / cat.nb_visits).toFixed(2) : "-";
    console.log(
      cat.label.substring(0, 39).padEnd(40),
      String(cat.nb_events).padStart(8),
      String(cat.nb_visits).padStart(8),
      ratio.padStart(7)
    );
  }
}

async function main() {
  console.log("Analyse approfondie des doublons Matomo");
  console.log(`URL: ${MATOMO_URL}`);
  console.log(`Site ID: ${MATOMO_SITE_ID}`);

  await analyseRatioParEtape();
  await analyseParJour();
  await analyseEventCategory();
  await analyseLiveVisits();
  await analyseTrackingCode();
}

main().catch(console.error);
