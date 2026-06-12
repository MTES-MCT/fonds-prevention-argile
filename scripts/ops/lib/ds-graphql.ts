/**
 * Client GraphQL Démarches Simplifiées partagé par les scripts ops.
 * Importe `env` (→ dotenv chargé) et réexporte `DEMARCHE_IDS`.
 */
import { DEMARCHE_IDS } from "./env";

export { DEMARCHE_IDS };

/** URL GraphQL DS (surchargeable par démarche / instance via l'option `url`). */
export const DS_GRAPHQL_URL =
  process.env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_URL || "https://www.demarches-simplifiees.fr/api/v2/graphql";

const API_KEY = process.env.DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY;

/** Renvoie la clé API DS ou termine le script si absente. */
export function requireDsApiKey(): string {
  if (!API_KEY) {
    console.error("DEMARCHES_SIMPLIFIEES_GRAPHQL_API_KEY manquante (env / .env.local)");
    process.exit(1);
  }
  return API_KEY;
}

export interface DsGraphqlResult<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
  httpError?: string;
}

/**
 * Exécute une requête GraphQL DS. Ne lève pas : renvoie `{ data }`, `{ errors }`
 * ou `{ httpError }`. L'option `url` permet de viser une autre instance.
 */
export async function dsQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
  opts: { url?: string } = {}
): Promise<DsGraphqlResult<T>> {
  try {
    const res = await fetch(opts.url ?? DS_GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${requireDsApiKey()}` },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) return { httpError: `HTTP ${res.status}` };
    return (await res.json()) as DsGraphqlResult<T>;
  } catch (e) {
    return { httpError: e instanceof Error ? e.message : String(e) };
  }
}

/** Statut DS d'un dossier par numéro. Renvoie `{ state }` ou `{ error }` (code ou message). */
export async function getDossierState(
  dossierNumber: number,
  opts: { url?: string } = {}
): Promise<{ state?: string; error?: string }> {
  const r = await dsQuery<{ dossier: { state: string } | null }>(
    "query($n:Int!){dossier(number:$n){state}}",
    { n: dossierNumber },
    opts
  );
  if (r.httpError) return { error: r.httpError };
  if (r.errors?.length) return { error: r.errors[0]?.extensions?.code ?? r.errors[0]?.message ?? "graphql_error" };
  return { state: r.data?.dossier?.state ?? undefined };
}
