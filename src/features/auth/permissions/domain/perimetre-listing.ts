import type { PerimetreListing } from "@/shared/database/repositories/parcours-prevention.repository";
import type { AgentScope } from "./types/agent-scope.types";

// Le listing ne filtre que par territoire : un droit « par entreprise » sans territoire ne donne rien à lister.
export function perimetreListing(scope: AgentScope): PerimetreListing {
  if (scope.canViewAllDossiers) return { kind: "national" };
  if (scope.departements.length === 0 && scope.epcis.length === 0) return { kind: "aucun" };
  return { kind: "territoire", departements: scope.departements, epcis: scope.epcis };
}
