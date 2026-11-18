// Contrôle les en-têtes de sécurité réellement servis par un site déployé (lecture seule).
// Usage : pnpm audit:en-tetes https://fonds-prevention-argile.beta.gouv.fr

import { PAGES_EMBARQUEES, enTetesAttendus, enTetesInterdits } from "../../../src/shared/config/en-tetes-http";

// Une page publique, une page gardée (redirection du middleware), une route d'API, un fichier statique.
const CHEMINS = ["/", "/simulateur", "/espace-agent", "/api/health", "/robots.txt", ...PAGES_EMBARQUEES];

const DELAI_MS = 20_000;

async function ecartsPour(base: string, chemin: string): Promise<string[]> {
  const reponse = await fetch(new URL(chemin, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(DELAI_MS),
  });

  const ecarts: string[] = [];
  for (const { key, value } of enTetesAttendus(chemin)) {
    const servi = reponse.headers.get(key);
    if (servi !== value) ecarts.push(`${key} : attendu « ${value} », servi « ${servi ?? "absent"} »`);
  }
  for (const key of enTetesInterdits(chemin)) {
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
  for (const chemin of CHEMINS) {
    try {
      const ecarts = await ecartsPour(base, chemin);
      nombreEcarts += ecarts.length;
      console.log(`${ecarts.length === 0 ? "OK    " : "ÉCART "} ${chemin}`);
      for (const ecart of ecarts) console.log(`         ${ecart}`);
    } catch (error) {
      nombreEcarts += 1;
      console.log(`ERREUR ${chemin} : ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (nombreEcarts > 0) {
    console.error(`\n${nombreEcarts} écart(s) sur ${base}`);
    process.exit(1);
  }
  console.log(`\nEn-têtes conformes sur ${base} (${CHEMINS.length} chemins)`);
}

void main();
