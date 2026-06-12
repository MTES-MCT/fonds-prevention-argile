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
