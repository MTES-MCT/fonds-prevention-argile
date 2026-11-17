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

/**
 * Mention de l'heure à laquelle Matomo a rendu un chiffre servi depuis la mémoire, ou null.
 * Le jour n'est précisé que s'il diffère d'aujourd'hui.
 */
export function formaterHeureCalcul(
  calculeLe: string | null | undefined,
  maintenant: Date = new Date()
): string | null {
  if (!calculeLe) return null;
  const instant = new Date(calculeLe);
  if (Number.isNaN(instant.getTime())) return null;

  const heure = instant.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (instant.toDateString() === maintenant.toDateString()) return `Chiffre calculé à ${heure}.`;

  const jour = instant.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  return `Chiffre calculé le ${jour} à ${heure}.`;
}

/** Ajoute cette mention à une infobulle, quand l'heure du calcul est connue. */
export function completerInfobulle(infobulle: string, calculeLe: string | null | undefined): string {
  const mention = formaterHeureCalcul(calculeLe);
  return mention ? `${infobulle} ${mention}` : infobulle;
}
