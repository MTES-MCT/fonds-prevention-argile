/**
 * Mesure la durée et la taille des requêtes Matomo que lancent les pages de statistiques.
 * Lecture seule : n'affiche ni le jeton ni aucun chiffre de fréquentation.
 *
 * Usage :
 *   tsx scripts/ops/debug/mesurer-matomo.ts
 *   tsx scripts/ops/debug/mesurer-matomo.ts --jours=365 --departement=36 --delai=60
 */

import "../lib/env";
import { getArg, getNumberArg } from "../lib/args";
import {
  decouperPeriodeMatomo,
  formaterDateMatomo,
} from "../../../src/features/backoffice/administration/acquisition/domain/decoupage-periode";

const URL_API = process.env.NEXT_PUBLIC_MATOMO_URL;
const SITE = process.env.NEXT_PUBLIC_MATOMO_SITE_ID;
const JETON = process.env.MATOMO_API_TOKEN;
const DIMENSION_DEPARTEMENT = process.env.NEXT_PUBLIC_MATOMO_DIMENSION_DEPARTEMENT_ID;
const DIMENSION_COMMUNE = process.env.NEXT_PUBLIC_MATOMO_DIMENSION_COMMUNE_ID;
const TUNNEL = process.env.NEXT_PUBLIC_MATOMO_FUNNEL_ID;

if (!URL_API || !SITE || !JETON) {
  console.error("Variables Matomo manquantes (NEXT_PUBLIC_MATOMO_URL, NEXT_PUBLIC_MATOMO_SITE_ID, MATOMO_API_TOKEN)");
  process.exit(1);
}

const jours = getNumberArg("jours", 30, 1);
const departement = getArg("departement");
const delaiMs = getNumberArg("delai", 60, 1) * 1000;

// Même règle que getGranulariteForPeriode : jour jusqu'à 30 jours, semaine jusqu'à 6 mois, mois au-delà.
const granularite = jours <= 30 ? "day" : jours <= 180 ? "week" : "month";

const fin = new Date();
const debut = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() - (jours - 1));
const plage = `${formaterDateMatomo(debut)},${formaterDateMatomo(fin)}`;
const sousPeriodes = decouperPeriodeMatomo(debut, fin, granularite);
const segmentDepartement =
  departement && DIMENSION_DEPARTEMENT ? `dimension${DIMENSION_DEPARTEMENT}==${departement}` : undefined;

async function mesurer(nom: string, params: Record<string, string | undefined>): Promise<void> {
  const corps = new URLSearchParams({ module: "API", idSite: SITE!, format: "JSON", token_auth: JETON! });
  for (const [cle, valeur] of Object.entries(params)) if (valeur !== undefined) corps.set(cle, valeur);

  const depart = performance.now();
  let issue: string;
  let taille = 0;
  try {
    const reponse = await fetch(URL_API!, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corps.toString(),
      signal: AbortSignal.timeout(delaiMs),
    });
    const texte = await reponse.text();
    taille = texte.length;
    issue = !reponse.ok ? `HTTP ${reponse.status}` : texte.includes('"result":"error"') ? "erreur Matomo" : "ok";
  } catch (error) {
    issue = error instanceof Error && error.name === "TimeoutError" ? "délai dépassé" : "erreur réseau";
  }
  const duree = Math.round(performance.now() - depart);
  console.log(`${nom.padEnd(52)} ${String(duree).padStart(6)} ms ${String(taille).padStart(9)} o  ${issue}`);
}

/** Lance les sous-périodes en parallèle, comme le service, et ne retient que la durée totale. */
async function mesurerDecoupe(nom: string, params: Record<string, string | undefined>): Promise<void> {
  const depart = performance.now();
  const resultats = await Promise.allSettled(
    sousPeriodes.map(({ period, date }) => {
      const corps = new URLSearchParams({ module: "API", idSite: SITE!, format: "JSON", token_auth: JETON! });
      for (const [cle, valeur] of Object.entries({ ...params, period, date })) {
        if (valeur !== undefined) corps.set(cle, valeur);
      }
      return fetch(URL_API!, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: corps.toString(),
        signal: AbortSignal.timeout(delaiMs),
      }).then(async (reponse) => (await reponse.text()).length);
    })
  );
  const duree = Math.round(performance.now() - depart);
  const echecs = resultats.filter((r) => r.status === "rejected").length;
  const taille = resultats.reduce((somme, r) => somme + (r.status === "fulfilled" ? r.value : 0), 0);
  const issue = echecs === 0 ? "ok" : `${echecs} échec(s) sur ${resultats.length}`;
  console.log(
    `${`${nom} (${resultats.length} appel(s))`.padEnd(52)} ${String(duree).padStart(6)} ms ${String(taille).padStart(9)} o  ${issue}`
  );
}

async function main(): Promise<void> {
  console.log(`Matomo ${new URL(URL_API!).host} — ${jours} jours (${plage}), granularité ${granularite}`);
  console.log(`Département : ${segmentDepartement ? departement : "aucun"} — délai ${delaiMs / 1000} s\n`);

  await mesurer("Visites par pas (courbe)", {
    method: "VisitsSummary.getVisits",
    period: granularite,
    date: plage,
    segment: segmentDepartement,
  });
  await mesurer("Résumé en range (visiteurs uniques, rebond)", {
    method: "VisitsSummary.get",
    period: "range",
    date: plage,
    segment: segmentDepartement,
  });
  await mesurerDecoupe("Évènements, sous-périodes", {
    method: "Events.getAction",
    flat: "1",
    segment: segmentDepartement,
  });

  const dimension = {
    method: "CustomDimensions.getCustomDimension",
    showColumns: "nb_visits",
    filter_limit: "-1",
    segment: "eventAction==simulateur_result_eligible",
  };
  if (DIMENSION_DEPARTEMENT) {
    await mesurerDecoupe("Par département, sous-périodes", { ...dimension, idDimension: DIMENSION_DEPARTEMENT });
  }
  if (DIMENSION_COMMUNE) {
    await mesurerDecoupe("Par commune, sous-périodes", { ...dimension, idDimension: DIMENSION_COMMUNE });
  }
  if (TUNNEL) {
    const ilYa6Jours = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate() - 6);
    await mesurer("Tunnel du simulateur, 7 jours en range", {
      method: "Funnels.getFunnelFlowTable",
      idFunnel: TUNNEL,
      period: "range",
      date: `${formaterDateMatomo(ilYa6Jours)},${formaterDateMatomo(fin)}`,
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
