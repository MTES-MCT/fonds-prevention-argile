/**
 * Formate une valeur provenant de Matomo pour affichage dans une DashboardStatCard.
 *
 * - Matomo en cours de chargement : "..."
 * - Matomo echoue / pas de donnees : "Indisponible"
 * - Donnee disponible : valeur formatee (ex: "4 955", "42,5%")
 */
export function formatMatomoValue(
  stat: { valeur: number } | null | undefined,
  matomoLoaded: boolean,
  suffix?: string
): string {
  if (!matomoLoaded) return "...";
  if (!stat) return "Indisponible";
  return `${stat.valeur.toLocaleString("fr-FR")}${suffix ?? ""}`;
}
