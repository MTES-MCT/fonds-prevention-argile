/** Adresse du visiteur vue par le routeur Scalingo, qui écrase X-Real-IP. */
export function adresseDepuisEnTetes(enTetes: Headers): string {
  const reelle = enTetes.get("x-real-ip")?.trim();
  if (reelle) return reelle;
  // Dernière valeur : la seule posée par un intermédiaire de confiance, les premières viennent du client.
  const transmises = enTetes.get("x-forwarded-for")?.split(",") ?? [];
  return transmises.at(-1)?.trim() || "inconnue";
}
