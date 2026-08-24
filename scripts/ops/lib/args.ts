/**
 * Parsing minimal des arguments CLI, partagé par les scripts ops.
 */
const args = process.argv.slice(2);

/** Valeur d'un argument de la forme `--name=value` (ou `undefined`). */
export function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

/** Présence d'un flag `--name`. */
export function hasFlag(name: string): boolean {
  return args.includes(`--${name}`);
}

/**
 * Valide une valeur numérique d'argument. Retourne `null` si elle est inexploitable
 * (vide, non numérique, sous `min`) — le `Number()` nu rendrait un `NaN` silencieux.
 */
export function parseNumberArg(raw: string | undefined, fallback: number, min = 0): number | null {
  if (raw === undefined) return fallback;
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= min ? value : null;
}

/** Valeur numérique d'un `--name=<nombre>`, avec repli. Sort en erreur si invalide. */
export function getNumberArg(name: string, fallback: number, min = 0): number {
  const raw = getArg(name);
  const value = parseNumberArg(raw, fallback, min);
  if (value === null) {
    console.error(`--${name} invalide : "${raw}" (attendu : un nombre >= ${min})`);
    process.exit(1);
  }
  return value;
}
