/**
 * Vérifie que le token GraphQL Démarches Simplifiées a bien accès (instructeur/admin)
 * à chaque démarche configurée (éligibilité, diagnostic, devis, factures).
 *
 * Une démarche en UNAUTHORIZED signifie que la synchro des dossiers de cette étape
 * échouera (cf. ADR-0009). Le script sort en erreur (exit 1) si au moins une démarche
 * de l'instance configurée est inaccessible — exploitable en monitoring / mise en service.
 *
 * Script autonome (aucun import `@/`) → lançable tel quel en local et sur Scalingo.
 *
 * Usage:
 *   npx tsx scripts/ops/check-ds-permissions.ts            # instance configurée (env)
 *   npx tsx scripts/ops/check-ds-permissions.ts --instance=both   # teste les deux domaines
 *   pnpm ds:check-permissions
 *
 * Prérequis : DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY + DEMARCHES_SIMPLIFIEES_ID_* dans l'env
 * (en local via .env.local ; sur Scalingo les variables sont déjà injectées).
 */

import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const INSTANCES = {
  simplifiees: "https://www.demarches-simplifiees.fr/api/v2/graphql",
  numerique: "https://demarche.numerique.gouv.fr/api/v2/graphql",
} as const;

const API_KEY = process.env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY;

if (!API_KEY) {
  console.error("DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY manquante (env / .env.local)");
  process.exit(1);
}

const configuredUrl = process.env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL || INSTANCES.simplifiees;

// Démarches configurées (on ignore celles non renseignées).
const DEMARCHES = [
  { etape: "eligibilite", id: process.env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE },
  { etape: "diagnostic", id: process.env.DEMARCHES_SIMPLIFIEES_ID_DIAGNOSTIC },
  { etape: "devis", id: process.env.DEMARCHES_SIMPLIFIEES_ID_DEVIS },
  { etape: "factures", id: process.env.DEMARCHES_SIMPLIFIEES_ID_FACTURES },
].filter((d): d is { etape: string; id: string } => Boolean(d.id));

if (DEMARCHES.length === 0) {
  console.error("Aucune démarche configurée (DEMARCHES_SIMPLIFIEES_ID_* absents)");
  process.exit(1);
}

const instanceArg = process.argv.find((a) => a.startsWith("--instance="))?.split("=")[1];
const instances =
  instanceArg === "both"
    ? [
        { label: "demarches-simplifiees.fr", url: INSTANCES.simplifiees },
        { label: "demarche.numerique.gouv.fr", url: INSTANCES.numerique },
      ]
    : [{ label: "(configuré)", url: configuredUrl }];

type CheckStatus = "OK" | "UNAUTHORIZED" | "NOT_FOUND" | "INVALID_ID" | "ERROR";

interface CheckResult {
  status: CheckStatus;
  detail: string;
  state?: string;
}

const QUERY = `query($n:Int!){demarche(number:$n){number title state}}`;

// L'API GraphQL DS attend un Int (max Int32). Un id non numérique ou hors plage
// (ex. placeholder "9999999999999999" en dev) est une erreur de config, pas un
// problème de permission : on le signale sans taper l'API.
const MAX_INT32 = 2147483647;

async function checkDemarche(url: string, id: string): Promise<CheckResult> {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0 || numericId > MAX_INT32) {
    return { status: "INVALID_ID", detail: "id non numérique ou hors plage (placeholder ?)" };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ query: QUERY, variables: { n: numericId } }),
    });

    if (!response.ok) {
      return { status: "ERROR", detail: `HTTP ${response.status}` };
    }

    const result = await response.json();

    if (result.errors?.length) {
      const code = result.errors[0]?.extensions?.code;
      if (code === "unauthorized") {
        return { status: "UNAUTHORIZED", detail: "token sans accès à cette démarche" };
      }
      return { status: "ERROR", detail: result.errors.map((e: { message: string }) => e.message).join(", ") };
    }

    const demarche = result.data?.demarche;
    if (!demarche) {
      return { status: "NOT_FOUND", detail: "démarche introuvable (numéro inexistant ?)" };
    }

    return { status: "OK", detail: demarche.title ?? "", state: demarche.state };
  } catch (error) {
    return { status: "ERROR", detail: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  let exitCode = 0;
  let warnings = 0;

  for (let i = 0; i < instances.length; i++) {
    const instance = instances[i];
    console.log(`\n=== Instance ${instance.label} : ${instance.url} ===`);

    for (const demarche of DEMARCHES) {
      const result = await checkDemarche(instance.url, demarche.id);
      const stateCol = result.state ? `state=${result.state}` : "";
      let line = `  ${demarche.etape.padEnd(12)} ${demarche.id.padEnd(8)} -> ${result.status.padEnd(13)} ${stateCol.padEnd(18)} ${result.detail}`;

      // Signale (sans bloquer) une démarche accessible mais non publiée. En preprod
      // c'est normal ; en prod une démarche non publiée mérite un coup d'oeil.
      if (result.status === "OK" && result.state && result.state !== "publiee") {
        line += " [non publiée]";
        warnings++;
      }
      console.log(line);

      // L'exit code reflète uniquement la première instance (= instance configurée
      // hors mode --instance=both). Tout statut != OK/NOT_FOUND = config ou
      // permission cassée qui bloque la synchro.
      if (i === 0 && result.status !== "OK" && result.status !== "NOT_FOUND") {
        exitCode = 1;
      }
    }
  }

  console.log("");
  if (exitCode === 0) {
    console.log("OK : toutes les démarches de l'instance configurée sont accessibles.");
  } else {
    console.log(
      "ECHEC : au moins une démarche inaccessible — rattacher le compte du token comme instructeur (cf. ADR-0009)."
    );
  }
  if (warnings > 0) {
    console.log(
      `INFO : ${warnings} démarche(s) non publiée(s) (state != publiee) — normal en preprod, à vérifier avant prod.`
    );
  }

  process.exit(exitCode);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
