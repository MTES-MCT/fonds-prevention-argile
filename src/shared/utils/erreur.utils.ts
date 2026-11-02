/** Nom et code SQL seulement : le message d'une requête Drizzle en échec contient ses paramètres. */
export function resumerErreur(error: unknown): string {
  if (!(error instanceof Error)) return "erreur inconnue";
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? `${error.name} (${code})` : error.name;
}

/** Violation d'une contrainte d'unicité PostgreSQL, que l'erreur vienne du driver ou de Drizzle. */
export function estViolationUnicite(error: unknown): boolean {
  const cause = error instanceof Error ? (error.cause as { code?: unknown } | undefined) : undefined;
  return cause?.code === "23505" || (error as { code?: unknown } | null)?.code === "23505";
}
