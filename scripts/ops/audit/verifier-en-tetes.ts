// Contrôle les en-têtes de sécurité réellement servis par un site déployé (lecture seule).
// Usage : pnpm audit:en-tetes https://fonds-prevention-argile.beta.gouv.fr

import { PAGES_EMBARQUEES, enTetesAttendus, enTetesInterdits } from "../../../src/shared/config/en-tetes-http";

interface Controle {
  chemin: string;
  // Sans statut attendu, une page d'erreur portant les bons en-têtes passerait pour conforme.
  statuts: number[];
  redirigeVers?: string;
  typeContenu?: RegExp;
}

const CONTROLES: Controle[] = [
  { chemin: "/", statuts: [200] },
  { chemin: "/simulateur", statuts: [200] },
  { chemin: "/espace-agent", statuts: [307], redirigeVers: "/connexion/agent" },
  // 503 quand la base ne répond pas (CI) : la route existe, c'est ce qu'on contrôle ici.
  { chemin: "/api/health", statuts: [200, 503] },
  { chemin: "/robots.txt", statuts: [200] },
  // `nosniff` fait refuser au navigateur un worker servi sous un autre type : la carte resterait vide.
  { chemin: "/maplibre-gl-worker.mjs", statuts: [200], typeContenu: /javascript/ },
  ...PAGES_EMBARQUEES.map((chemin) => ({
    chemin,
    // Le simulateur de vulnérabilité répond 404 là où il n'est pas ouvert (production, ADR-0030).
    statuts: chemin === "/embed-vulnerabilite-rga" ? [200, 404] : [200],
  })),
];

const DELAI_MS = 20_000;

async function ecartsPour(base: string, controle: Controle): Promise<string[]> {
  const reponse = await fetch(new URL(controle.chemin, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(DELAI_MS),
  });

  const ecarts: string[] = [];
  if (!controle.statuts.includes(reponse.status)) {
    ecarts.push(`statut ${reponse.status}, attendu ${controle.statuts.join(" ou ")}`);
  }
  const destination = reponse.headers.get("location") ?? "";
  if (controle.redirigeVers && !destination.includes(controle.redirigeVers)) {
    ecarts.push(`redirection vers « ${destination || "nulle part"} », attendue vers ${controle.redirigeVers}`);
  }
  const type = reponse.headers.get("content-type") ?? "";
  if (controle.typeContenu && !controle.typeContenu.test(type)) {
    ecarts.push(`Content-Type « ${type || "absent"} », attendu ${controle.typeContenu}`);
  }
  for (const { key, value } of enTetesAttendus(controle.chemin)) {
    const servi = reponse.headers.get(key);
    if (servi !== value) ecarts.push(`${key} : attendu « ${value} », servi « ${servi ?? "absent"} »`);
  }
  for (const key of enTetesInterdits(controle.chemin)) {
    const servi = reponse.headers.get(key);
    if (servi !== null) ecarts.push(`${key} : ne doit pas être servi, vaut « ${servi} »`);
  }
  return ecarts;
}

async function main(): Promise<void> {
  const base = process.argv[2];
  if (!base || !/^https?:\/\//.test(base)) {
    console.error("Usage : pnpm audit:en-tetes <https://site>");
    process.exit(2);
  }

  let nombreEcarts = 0;
  for (const controle of CONTROLES) {
    try {
      const ecarts = await ecartsPour(base, controle);
      nombreEcarts += ecarts.length;
      console.log(`${ecarts.length === 0 ? "OK    " : "ÉCART "} ${controle.chemin}`);
      for (const ecart of ecarts) console.log(`         ${ecart}`);
    } catch (error) {
      nombreEcarts += 1;
      console.log(`ERREUR ${controle.chemin} : ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (nombreEcarts > 0) {
    console.error(`\n${nombreEcarts} écart(s) sur ${base}`);
    process.exit(1);
  }
  console.log(`\nEn-têtes conformes sur ${base} (${CONTROLES.length} chemins)`);
}

void main();
