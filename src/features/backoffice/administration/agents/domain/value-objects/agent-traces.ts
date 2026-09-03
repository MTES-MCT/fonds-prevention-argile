import type { AgentTracesCount } from "@/shared/database/repositories/agents.repository";

type TraceKey = keyof Omit<AgentTracesCount, "total">;

/** [clé, singulier, pluriel] — l'ordre pilote celui du résumé affiché. */
const LIBELLES: Array<[TraceKey, string, string]> = [
  ["actions", "action", "actions"],
  ["qualifications", "qualification", "qualifications"],
  ["archivages", "archivage", "archivages"],
  ["dossiersCrees", "dossier créé", "dossiers créés"],
  ["simulationsEditees", "simulation modifiée", "simulations modifiées"],
];

/**
 * Résume les traces d'un agent en une énumération lisible ("12 actions, 3 dossiers créés").
 * Chaîne vide si l'agent n'a rien laissé.
 */
export function formatTracesResume(traces: AgentTracesCount): string {
  return LIBELLES.filter(([cle]) => traces[cle] > 0)
    .map(([cle, singulier, pluriel]) => `${traces[cle]} ${traces[cle] > 1 ? pluriel : singulier}`)
    .join(", ");
}
