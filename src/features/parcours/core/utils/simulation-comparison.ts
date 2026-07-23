import type { RGASimulationData } from "@/shared/domain/types";

function withoutSimulatedAt(sim: RGASimulationData): Record<string, unknown> {
  const rest = { ...sim } as Record<string, unknown>;
  delete rest.simulatedAt;
  return rest;
}

// Sérialisation à clés triées : le JSONB Postgres et l'objet client peuvent différer d'ordre.
function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

// Compare deux simulations hors `simulatedAt` (regénéré à chaque migration) ; un côté
// null/absent = changement (1er rattachement).
export function isSameSimulationContent(
  a: RGASimulationData | null | undefined,
  b: RGASimulationData | null | undefined
): boolean {
  if (!a || !b) return false;
  return stableStringify(withoutSimulatedAt(a)) === stableStringify(withoutSimulatedAt(b));
}
