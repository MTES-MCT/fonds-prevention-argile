import type { CreateDossierResponse } from "@/lib/api/demarches-simplifiees/rest/types";
import type {
  DemarcheDetailed,
  DossiersConnection,
  Dossier,
} from "@/lib/api/demarches-simplifiees/graphql/types";

/**
 * Types de résultats pour les pages de test
 */

// Résultats possibles pour les tests REST (préremplissage)
export type RestTestResult = CreateDossierResponse | { url: string } | null;

// Résultats possibles pour les tests GraphQL
export type GraphQLTestResult =
  | DemarcheDetailed
  | DossiersConnection
  | Dossier
  | { total: number; byState: Record<string, number>; archived: number }
  | null;

// Type générique si vous voulez gérer les deux
export type TestResult = RestTestResult | GraphQLTestResult;

// Type guards pour identifier le type de résultat
export function isDossierResponse(
  result: unknown
): result is CreateDossierResponse {
  return (
    result !== null &&
    typeof result === "object" &&
    "dossier_url" in result &&
    "dossier_number" in result
  );
}

export function isUrlResponse(result: unknown): result is { url: string } {
  return (
    result !== null &&
    typeof result === "object" &&
    "url" in result &&
    !("dossier_url" in result)
  );
}

export function isDemarche(result: unknown): result is DemarcheDetailed {
  return (
    result !== null &&
    typeof result === "object" &&
    "title" in result &&
    "state" in result &&
    !("nodes" in result)
  );
}

export function isDossiersConnection(
  result: unknown
): result is DossiersConnection {
  return (
    result !== null &&
    typeof result === "object" &&
    "nodes" in result &&
    "pageInfo" in result
  );
}

export function isDossier(result: unknown): result is Dossier {
  return (
    result !== null &&
    typeof result === "object" &&
    "number" in result &&
    "state" in result &&
    !("title" in result)
  );
}

export function isStatistics(
  result: unknown
): result is {
  total: number;
  byState: Record<string, number>;
  archived: number;
} {
  return (
    result !== null &&
    typeof result === "object" &&
    "total" in result &&
    "byState" in result &&
    "archived" in result
  );
}
